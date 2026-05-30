#!/usr/bin/env python3
"""
cacic_salud.py — Script unificado CAETI UAI
Scraping → Limpieza → Enriquecimiento → Filtro (≥2022) → Excel final

Correr con: python cacic_salud.py
Output: REPOSITORIO_SALUD_2022.xlsx + cacic_salud_log.csv + QA_REPORT.md

Secretos: copiar `.env.example` a `.env` y completar (al menos ZENODO_TOKEN).
"""

# ═══════════════════════════════════════════════════════════════
# IMPORTS
# ═══════════════════════════════════════════════════════════════
import csv, json, logging, os, re, sys, time, warnings
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

# Carga de .env (opcional: si no está python-dotenv, las env vars se leen igual).
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

warnings.filterwarnings("ignore")

# ═══════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════
CONFIG = {
    # Archivos
    "base_file":    "CACIC_COLGATE.xlsx",
    "output_file":  "REPOSITORIO_SALUD_2022.xlsx",
    "log_csv":      "cacic_salud_log.csv",
    "checkpoint":   "cacic_checkpoint.csv",
    "qa_report":    "QA_REPORT.md",

    # Scraping
    "run_scraping":    True,
    "max_per_source":  500,
    "keywords": [
        "health", "medical", "clinical", "disease", "patient",
        "hospital", "cancer", "diabetes", "heart", "brain",
        "mental health", "covid", "ehr", "radiology", "genomic",
        "drug", "mortality", "diagnosis", "ECG", "MRI", "tumor",
        "symptom", "treatment", "epidemiol", "biomedical",
        "alzheimer", "parkinson", "obesity", "hypertension", "asthma",
        "sepsis", "stroke", "syndrome", "infection", "virus",
        "dementia", "tuberculosis", "oncology", "cardiology",
        "neurology", "dermatology", "pediatrics", "psychiatry",
        "immunology", "pathology", "pharmacology", "ophthalmology",
        "morbidity", "vaccine", "surveillance", "registry",
        "population health", "public health",
        "salud", "clinica", "paciente", "hospitalario", "enfermedad",
        "diagnostico", "tratamiento", "epidemiologia",
    ],

    # Fuentes activas
    "sources": {
        "kaggle":         True,
        "physionet":      False,
        "uci":            True,
        "healthdata_gov": True,
        "zenodo":         True,
        "huggingface":    True,
    },

    # Tokens de API — SE LEEN DEL ENTORNO. Nunca hardcodear acá.
    "kaggle_token": os.environ.get("KAGGLE_API_TOKEN") or None,
    "zenodo_token": os.environ.get("ZENODO_TOKEN") or None,
    "hf_token":     os.environ.get("HUGGINGFACE_TOKEN") or None,

    # Filtro temporal
    "year_cutoff": 2022,

    # Delays / paralelismo
    "request_delay":  0.5,
    "retry_delay":    1.5,
    "max_retries":    1,    # antes 3 → bajado para evitar cuelgues en DNS muerto (HealthData.gov)
    "update_workers": 15,
    "checkpoint_every": 200,
    "request_timeout":  5,  # antes 10 → fail-fast en URLs caídas
}

# ═══════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("cacic_salud.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# RUN STATS — métricas por fuente para el reporte QA
# ═══════════════════════════════════════════════════════════════
RUN_STATS: Dict[str, Counter] = defaultdict(Counter)

def _stat(source: str, key: str, n: int = 1) -> None:
    """Suma `n` al contador `key` de la fuente `source`. Thread-safe a nivel
    de fuente porque cada scraper toca su propia clave."""
    RUN_STATS[source][key] += n

# ═══════════════════════════════════════════════════════════════
# COLUMNAS FINALES (19)
# ═══════════════════════════════════════════════════════════════
COLS = [
    "Nro", "Nombre del dataset", "Área médica", "Tipo de datos",
    "Fuente", "Autor / Institución", "País", "Cant. registros",
    "Tipo de formato", "Variables principales", "Cant. variables",
    "Año publicación", "Año actualización", "Link", "Idioma",
    "Breve descripción", "Propuesta / Objetivo", "Observaciones",
    "Integrante responsable",
]

COLUMN_ALIASES = {
    "Nro de Dataset": "Nro", "N°": "Nro",
    "Cantidad de registros": "Cant. registros",
    "Cantidad de variables": "Cant. variables",
    "Idioma del dataset": "Idioma",
    "Año": "Año publicación",
    "Nombre": "Nombre del dataset",
}

CLASSIC_NAMES = {
    "mimic", "mit-bih", "nhanes", "brfss", "chexpert", "chest x-ray",
    "isic", "tcga", "eicu", "physiobank", "imagenet", "shhs", "uk biobank",
    "physionet", "luna16", "lidc", "chestx-ray14",
}

# ═══════════════════════════════════════════════════════════════
# HTTP SESSION
# ═══════════════════════════════════════════════════════════════
def _make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=CONFIG["max_retries"],
        backoff_factor=CONFIG["retry_delay"],
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://",  HTTPAdapter(max_retries=retry))
    s.headers["User-Agent"] = "HealthDatasetScraper/2.0 (research, CAETI-UAI)"
    return s

SESSION = _make_session()

def safe_get(url: str, params: dict = None, timeout: int = None,
             headers: dict = None, verify: bool = True) -> Optional[Any]:
    try:
        time.sleep(CONFIG["request_delay"])
        r = SESSION.get(url, params=params, headers=headers,
                        timeout=timeout or CONFIG["request_timeout"],
                        verify=verify)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.Timeout:
        log.warning(f"Timeout: {url}")
    except requests.exceptions.HTTPError as e:
        code = getattr(getattr(e, "response", None), "status_code", "?")
        log.warning(f"HTTP {code}: {url}")
    except Exception as e:
        log.warning(f"Request error ({type(e).__name__}): {url} — {e}")
    return None

# ═══════════════════════════════════════════════════════════════
# CLASIFICADORES
# ═══════════════════════════════════════════════════════════════
MEDICAL_AREAS = {
    "Oncología":                ["cancer","tumor","oncolog","carcinoma","leukemia","lymphoma","melanoma","glioma"],
    "Cardiología":              ["heart","cardiac","cardiovascular","ecg","ekg","arrhythmia","stroke","coronary","myocardial"],
    "Neurología":               ["brain","neural","neurolog","alzheimer","parkinson","epilepsy","dementia","eeg","cerebral","cognitive"],
    "Diabetes / Endocrinología":["diabetes","glucose","insulin","thyroid","endocrin","obesity","metabolic"],
    "Imagen Médica":            ["radiology","imaging","mri","ct scan","x-ray","xray","ultrasound","mammograph","dicom","fundus","retina"],
    "Genómica / Bioinformática":["genomic"," dna ","rna","bioinformat","genome","genetic","snp","sequencing","gene expression"],
    "Salud Mental":             ["mental health","depression","anxiety","psychiatric","schizophrenia","bipolar","ptsd","suicide"],
    "Epidemiología / Salud Pública":["epidemiol","covid","pandemic","infectious","vaccine","mortality","morbidity","public health"],
    "UCI / Cuidados Intensivos":["icu","intensive care","critical care","ehr","electronic health","mimic","sepsis"],
    "Respiratorio":             ["respiratory"," lung ","pneumonia","asthma","pulmonary","copd","tuberculosis"],
    "Farmacología":             ["drug","medication","pharma","adverse","clinical trial","treatment","prescription"],
    "Pediatría / Neonatal":     ["pediatric","child","infant","neonatal","birth weight","newborn"],
    "Señales / Fisiología":     ["signal","eeg","ecg","emg","ppg","biosignal","physiolog","waveform","vital signs"],
    "Dermatología":             ["skin","dermatol","lesion","wound","rash"],
    "Oftalmología":             ["eye","retina","ophthal","glaucoma","fundus","vision"],
    "General / Multidisciplinar": [],
}

DATA_TYPES = {
    "Imágenes médicas":     ["image","imaging","radiology","mri","ct","xray","dicom","png","jpg","fundus","scan"],
    "Señales fisiológicas": ["signal","ecg","ekg","eeg","emg","waveform","time series","wfdb","edf","biosignal"],
    "Genómico":             ["genomic","gene","dna","rna","sequence","fasta","vcf"],
    "EHR (Historia Clínica)":["ehr","electronic health","clinical notes","mimic","patient record","emr","discharge"],
    "Epidemiológico":       ["epidemiol","survey","population","demographic","covid","mortality","registry"],
    "Texto clínico (NLP)":  ["nlp","text","clinical notes","report","natural language","discharge summary"],
    "Señales de audio":     ["audio","speech","sound","voice","cough"],
    "Clínico (tabular)":    ["clinical","diagnosis","patient","hospital","medical record","csv","tabular","laboratory"],
}

FORMAT_KEYWORDS = {
    "CSV":   ["csv"], "JSON": ["json"], "EDF": ["edf"], "WFDB": ["wfdb",".dat",".hea"],
    "DICOM": ["dicom","dcm"], "FASTA/FASTQ": ["fasta","fastq"], "Parquet": ["parquet"],
    "Imágenes (PNG/JPG)": ["png","jpg","jpeg","tif","tiff"], "HDF5": ["hdf5",".h5"],
    "Excel": [".xls",".xlsx"], "MATLAB": [".mat","matlab"], "NIfTI": ["nifti",".nii"],
    "TSV": ["tsv"], "XML": ["xml"], "VCF": [".vcf"],
}

LANG_MAP = {"en":"Inglés","es":"Español","fr":"Francés","de":"Alemán",
            "pt":"Portugués","zh":"Chino","it":"Italiano","ja":"Japonés"}

# Matching con word boundaries y memoización.
# Fix bug original: `"cancer" in "dancer"` daba True por substring.
_KW_PATTERN_CACHE: Dict[str, "re.Pattern"] = {}
_NON_WORD = re.compile(r"\W+")

def _kw_pattern(kw: str) -> "re.Pattern":
    """Compila keyword con boundary al INICIO (matchea prefijos médicos como
    `epidemiol`→`epidemiology`, pero evita falsos positivos como `cancer`→`dancer`).
    Memoizado."""
    k = (kw or "").strip().lower()
    pat = _KW_PATTERN_CACHE.get(k)
    if pat is None:
        pat = re.compile(rf"\b{re.escape(k)}", re.IGNORECASE)
        _KW_PATTERN_CACHE[k] = pat
    return pat

def _kw_count(text: str, kws: List[str]) -> int:
    if not text or not kws:
        return 0
    return sum(1 for kw in kws if _kw_pattern(kw).search(text))

def classify_area(text: str) -> str:
    scores = {a: _kw_count(text, kws)
              for a, kws in MEDICAL_AREAS.items() if a != "General / Multidisciplinar"}
    return max(scores, key=scores.get) if any(scores.values()) else "General / Multidisciplinar"

def classify_type(text: str) -> str:
    scores = {d: _kw_count(text, kws) for d, kws in DATA_TYPES.items()}
    return max(scores, key=scores.get) if any(scores.values()) else "Clínico (tabular)"

def detect_format(text: str) -> str:
    found = [f for f, kws in FORMAT_KEYWORDS.items() if _kw_count(text, kws) > 0]
    return ", ".join(found[:3]) if found else "Mixto / No especificado"

def is_health(text: str) -> bool:
    return _kw_count(text, CONFIG["keywords"]) > 0

def empty_row() -> Dict[str, Any]:
    return {c: "" for c in COLS}

def _hf_size_to_count(tags: list) -> Optional[int]:
    """Parsea tag 'size_categories:1M<n<10M' → límite inferior como entero."""
    for t in tags:
        s = str(t)
        if not s.startswith("size_categories:"): continue
        cat = s.replace("size_categories:", "")
        m = re.search(r"([\d.]+)([KMB]?)<n", cat, re.I)
        if m:
            n, suf = float(m.group(1)), m.group(2).upper()
            if suf == "K": n *= 1_000
            elif suf == "M": n *= 1_000_000
            elif suf == "B": n *= 1_000_000_000
            return int(n)
    return None

def _auto_propuesta(area: str, tipo: str) -> str:
    if area and tipo:
        return f"Dataset de {tipo} para investigación en {area}."
    return ""

# ═══════════════════════════════════════════════════════════════
# NUMERIC HELPERS
# ═══════════════════════════════════════════════════════════════
def parse_int(val) -> Optional[int]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip().replace(" ","").replace("+","").replace("~","").replace(">","").replace("<","")
    if s in ("", "nan", "None", "NaN"):
        return None
    m = re.match(r"^([\d,.]+)\s*([MKmk]?)$", s)
    if m:
        try:
            num = float(m.group(1).replace(",", ""))
            suffix = m.group(2).upper()
            if suffix == "M": num *= 1_000_000
            elif suffix == "K": num *= 1_000
            return int(num)
        except ValueError:
            pass
    s2 = re.sub(r"[^\d.]", "", s)
    try:
        return int(float(s2)) if s2 else None
    except (ValueError, OverflowError):
        return None

def parse_year(val) -> Optional[int]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if s in ("", "nan", "None"):
        return None
    m = re.search(r"\b(19|20)\d{2}\b", s)
    if m:
        return int(m.group(0))
    try:
        y = int(float(s))
        return y if 1900 <= y <= 2100 else None
    except (ValueError, OverflowError):
        return None

def extract_year(val) -> str:
    y = parse_year(val)
    return str(y) if y else ""

def _to_year(date_val) -> Optional[int]:
    if not date_val:
        return None
    try:
        if isinstance(date_val, (int, float)):
            return pd.to_datetime(int(date_val), unit="s").year
        return pd.to_datetime(str(date_val)).year
    except Exception:
        return None

# ═══════════════════════════════════════════════════════════════
# KAGGLE AUTH
# ═══════════════════════════════════════════════════════════════
def _kaggle_auth():
    """Resuelve credenciales para los endpoints de Kaggle.

    Orden: kaggle.json (Basic Auth) PRIMERO porque varios endpoints individuales
    (`/api/v1/datasets/{owner}/{slug}`) devuelven 401 con Bearer. El listado sí
    acepta Bearer, pero priorizamos consistencia. Solo caemos a Bearer si no
    hay kaggle.json.
    """
    cf = Path.home() / ".kaggle" / "kaggle.json"
    if cf.exists():
        try:
            c = json.loads(cf.read_text(encoding="utf-8"))
            return "basic", (c["username"], c["key"])
        except Exception as e:
            log.warning(f"kaggle.json corrupto: {e}")
    t = CONFIG.get("kaggle_token")
    if t:
        return "bearer", t
    tf = Path.home() / ".kaggle" / "access_token"
    if tf.exists():
        return "bearer", tf.read_text(encoding="utf-8").strip()
    ev = os.environ.get("KAGGLE_API_TOKEN", "")
    if ev:
        return "bearer", ev
    return None, None

KAGGLE_AUTH_TYPE, KAGGLE_AUTH_CREDS = _kaggle_auth()

# ═══════════════════════════════════════════════════════════════
# SCRAPERS
# ═══════════════════════════════════════════════════════════════

# ── Kaggle ───────────────────────────────────────────────────
def scrape_kaggle(max_items: int) -> List[Dict]:
    log.info("=== KAGGLE ===")
    results, seen = [], set()
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi(); api.authenticate()
    except Exception as e:
        log.error(f"Kaggle auth fallida: {e}"); return []

    for term in CONFIG["keywords"][:12]:
        if len(results) >= max_items: break
        page = 1
        while len(results) < max_items:
            try:
                batch = api.dataset_list(search=term, sort_by="votes", page=page)
            except Exception:
                break
            if not batch: break
            added = 0
            for ds in batch:
                if len(results) >= max_items: break
                _stat("Kaggle", "items_seen")
                try:
                    ref  = getattr(ds, "ref", "") or ""
                    link = f"https://www.kaggle.com/datasets/{ref}" if ref else ""
                    if not link or link in seen:
                        _stat("Kaggle", "items_dup"); continue
                    title    = getattr(ds, "title", "") or ""
                    subtitle = getattr(ds, "subtitle", "") or ""
                    tags_raw = getattr(ds, "tags", []) or []
                    tags_str = " ".join(getattr(t, "ref", str(t)) for t in tags_raw)
                    combined = f"{title} {subtitle} {tags_str}"
                    if not is_health(combined):
                        _stat("Kaggle", "items_not_health"); continue
                    seen.add(link)
                    row = empty_row()
                    row["Nombre del dataset"] = title
                    row["Área médica"]        = classify_area(combined)
                    row["Tipo de datos"]      = classify_type(combined)
                    row["Fuente"]             = "Kaggle"
                    row["Autor / Institución"]= getattr(ds,"ownerName","") or getattr(ds,"creatorName","") or ""
                    row["Tipo de formato"]    = detect_format(tags_str)
                    row["Año publicación"]    = extract_year(getattr(ds,"lastUpdated",""))
                    row["Link"]               = link
                    row["Idioma"]             = "Inglés"
                    row["Breve descripción"]  = (subtitle or title)[:300]
                    row["Propuesta / Objetivo"] = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                    row["Observaciones"]      = f"Tags: {tags_str[:100]}" if tags_str else ""
                    results.append(row); added += 1
                    _stat("Kaggle", "items_ok")
                except Exception as e:
                    _stat("Kaggle", "items_error")
                    log.debug(f"Kaggle parse error ({type(e).__name__}): {e}")
                    continue
            if len(batch) < 20 or added == 0: break
            page += 1; time.sleep(0.8)
    log.info(f"Kaggle: {len(results)} datasets")
    return results

# ── PhysioNet ─────────────────────────────────────────────────
def scrape_physionet(max_items: int) -> List[Dict]:
    log.info("=== PHYSIONET ===")
    results, seen = [], set()
    base = "https://physionet.org"
    page = 1
    while len(results) < max_items:
        time.sleep(CONFIG["request_delay"])
        try:
            resp = SESSION.get(f"{base}/content/", params={"page": page},
                               headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
            resp.raise_for_status()
        except Exception as e:
            log.warning(f"PhysioNet page {page}: {e}"); break
        slugs = re.findall(r'href="(/content/([a-z0-9][a-z0-9\-]+)/([0-9][0-9.]+)/)"', resp.text)
        if not slugs: break
        for path, slug, version in slugs:
            if len(results) >= max_items: break
            link = f"{base}{path}"
            if link in seen:
                _stat("PhysioNet", "items_dup"); continue
            _stat("PhysioNet", "items_seen")
            time.sleep(CONFIG["request_delay"])
            try:
                detail = SESSION.get(link, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
                detail.raise_for_status()
                html = detail.text
                title_m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
                title   = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else slug
                abs_m   = re.search(r'<section[^>]*id=["\']abstract["\'][^>]*>(.*?)</section>', html, re.S)
                abstract = re.sub(r'<[^>]+>', ' ', abs_m.group(1)).strip()[:400] if abs_m else ""
                abstract = re.sub(r'\s+', ' ', abstract)
                combined = f"{title} {abstract}"
                if not is_health(combined):
                    _stat("PhysioNet", "items_not_health"); continue
                seen.add(link)
                year_m  = re.search(r'(\b20[012]\d\b|\b19[89]\d\b)', html)
                auth_m  = re.findall(r'class=["\'][^"\']*author[^"\']*["\'][^>]*>(.*?)</[a-z]+>', html, re.S)
                authors = ", ".join(re.sub(r'<[^>]+>', '', a).strip() for a in auth_m[:3]) if auth_m else "PhysioNet"
                row = empty_row()
                row["Nombre del dataset"] = title
                row["Área médica"]        = classify_area(combined)
                row["Tipo de datos"]      = classify_type(combined)
                row["Fuente"]             = "PhysioNet"
                row["Autor / Institución"]= authors
                row["País"]               = "EE.UU."
                row["Tipo de formato"]    = detect_format(abstract)
                row["Año publicación"]    = year_m.group(1) if year_m else ""
                row["Link"]               = link
                row["Idioma"]             = "Inglés"
                row["Breve descripción"]  = abstract[:300]
                row["Propuesta / Objetivo"] = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                row["Observaciones"]      = f"Versión: {version}"
                results.append(row)
                _stat("PhysioNet", "items_ok")
            except Exception as e:
                _stat("PhysioNet", "items_error")
                log.debug(f"PhysioNet {slug} ({type(e).__name__}): {e}")
                continue
        page += 1
    log.info(f"PhysioNet: {len(results)} datasets")
    return results

# ── UCI ML Repository ─────────────────────────────────────────
def scrape_uci(max_items: int) -> List[Dict]:
    log.info("=== UCI ===")
    results, seen = [], set()
    list_url   = "https://archive.ics.uci.edu/api/datasets/list"
    detail_url = "https://archive.ics.uci.edu/api/dataset"
    health_kws = CONFIG["keywords"] + ["health","medical","biology","clinical","disease"]
    # UCI puede fallar verificación SSL por certificado expirado o CA no instalada.
    # verify=False es seguro aquí: es un repositorio público de lectura.
    _uci_verify = True
    test = safe_get(list_url, params={"search": "health"}, verify=True)
    if test is None:
        log.warning("UCI: SSL verify=True falló. Reintentando con verify=False. "
                    "Para silenciar este warning: pip install --upgrade certifi")
        _uci_verify = False
    ids_seen, candidate_ids = set(), []
    for term in ["health","medical","disease","clinical","cancer","diabetes","heart","brain","patient","hospital"]:
        if len(candidate_ids) >= max_items * 3: break
        data = safe_get(list_url, params={"search": term}, verify=_uci_verify)
        if not data: continue
        for item in (data.get("data") or []):
            uid = item.get("id")
            if uid and uid not in ids_seen:
                ids_seen.add(uid); candidate_ids.append(uid)
    for uid in candidate_ids:
        if len(results) >= max_items: break
        _stat("UCI", "items_seen")
        detail = safe_get(detail_url, params={"id": uid}, verify=_uci_verify)
        if not detail:
            _stat("UCI", "items_error"); continue
        try:
            d        = detail.get("data", detail)
            name     = d.get("name", "") or ""
            abstract = d.get("abstract", "") or ""
            area     = d.get("area", "") or ""
            combined = f"{name} {abstract} {area}"
            if not is_health(combined):
                _stat("UCI", "items_not_health"); continue
            link = d.get("repository_url") or f"https://archive.ics.uci.edu/dataset/{uid}"
            if link in seen:
                _stat("UCI", "items_dup"); continue
            seen.add(link)
            creators  = d.get("creators", []) or []
            authors   = ", ".join(str(c) for c in creators[:3]) if isinstance(creators, list) else str(creators)
            tasks     = d.get("tasks", []) or []
            tasks_str = ", ".join(tasks[:3]) if isinstance(tasks, list) else str(tasks)
            row = empty_row()
            row["Nombre del dataset"]  = name
            row["Área médica"]         = classify_area(combined)
            row["Tipo de datos"]       = classify_type(combined)
            row["Fuente"]              = "UCI ML Repository"
            row["Autor / Institución"] = authors or "UCI"
            row["País"]                = "EE.UU."
            row["Cant. registros"]     = str(d.get("num_instances","")) if d.get("num_instances") else ""
            row["Tipo de formato"]     = "CSV"
            row["Cant. variables"]     = str(d.get("num_features","")) if d.get("num_features") else ""
            row["Año publicación"]     = str(d.get("year_of_dataset_creation","")) if d.get("year_of_dataset_creation") else ""
            row["Link"]                = link
            row["Idioma"]              = "Inglés"
            row["Breve descripción"]   = abstract[:300]
            row["Propuesta / Objetivo"] = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
            row["Observaciones"]       = f"Tareas ML: {tasks_str}" if tasks_str else ""
            results.append(row)
            _stat("UCI", "items_ok")
        except Exception as e:
            _stat("UCI", "items_error")
            log.debug(f"UCI parse error uid={uid} ({type(e).__name__}): {e}")
            continue
    log.info(f"UCI: {len(results)} datasets")
    return results

# ── HealthData.gov ────────────────────────────────────────────
def scrape_healthdata_gov(max_items: int) -> List[Dict]:
    log.info("=== HEALTHDATA.GOV ===")
    results, seen = [], set()
    base_url = "https://healthdata.gov/api/catalog/v1"
    limit, offset = 100, 0
    while len(results) < max_items:
        data = safe_get(base_url, params={"only":"datasets","limit":limit,"offset":offset})
        if not data: break
        items = data.get("results", [])
        if not items: break
        for item in items:
            if len(results) >= max_items: break
            _stat("HealthData.gov", "items_seen")
            try:
                resource = item.get("resource", {})
                classif  = item.get("classification", {})
                name     = resource.get("name", "") or ""
                desc     = resource.get("description", "") or ""
                combined = f"{name} {desc}"
                if not is_health(combined):
                    _stat("HealthData.gov", "items_not_health"); continue
                link = item.get("permalink") or item.get("link") or ""
                if not link or link in seen:
                    _stat("HealthData.gov", "items_dup"); continue
                seen.add(link)
                cats      = classif.get("categories", []) or []
                category  = ", ".join(cats[:2]) if cats else ""
                dom_meta  = classif.get("domain_metadata", []) or []
                publisher = "HealthData.gov"
                for m in (dom_meta if isinstance(dom_meta, list) else []):
                    if isinstance(m, dict) and m.get("key","").lower() in ("publisher","agency"):
                        publisher = m.get("value", publisher); break
                created = resource.get("createdAt","") or resource.get("updatedAt","") or ""
                row = empty_row()
                row["Nombre del dataset"]  = name
                row["Área médica"]         = classify_area(combined)
                row["Tipo de datos"]       = classify_type(combined)
                row["Fuente"]              = "HealthData.gov"
                row["Autor / Institución"] = publisher
                row["País"]                = "EE.UU."
                row["Tipo de formato"]     = "CSV"
                row["Año publicación"]     = extract_year(created)
                row["Link"]                = link
                row["Idioma"]              = "Inglés"
                row["Breve descripción"]   = desc[:300]
                row["Propuesta / Objetivo"] = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                row["Observaciones"]       = f"Categoría: {category}" if category else ""
                results.append(row)
                _stat("HealthData.gov", "items_ok")
            except Exception as e:
                _stat("HealthData.gov", "items_error")
                log.debug(f"HealthData.gov parse error ({type(e).__name__}): {e}")
                continue
        if len(items) < limit: break
        offset += limit
    log.info(f"HealthData.gov: {len(results)} datasets")
    return results

# ── Zenodo ────────────────────────────────────────────────────
def scrape_zenodo(max_items: int) -> List[Dict]:
    log.info("=== ZENODO ===")
    results, seen = [], set()
    base_url = "https://zenodo.org/api/records"
    token = CONFIG.get("zenodo_token")
    # IMPORTANTE: no mutar SESSION.headers global (race condition con otros
    # scrapers en paralelo). Pasar el header por request.
    zenodo_headers = {"Authorization": f"Bearer {token}"} if token else None
    if not token:
        log.warning("ZENODO_TOKEN no configurado. La red puede bloquear "
                    "requests anónimos. Configurá .env (ver .env.example).")
    search_terms = [
        "medical","health","clinical","cancer","diabetes",
        "radiology","genomic","EHR","epidemiology","neurology",
        "cardiology","vaccine","pathology","pediatrics","psychiatry",
    ]
    for term in search_terms:
        if len(results) >= max_items: break
        page = 1
        while len(results) < max_items:
            data = safe_get(base_url,
                            params={"q":term,"size":50,"page":page,"sort":"newest"},
                            headers=zenodo_headers)
            if not data: break
            items = data.get("hits", {}).get("hits", [])
            if not items: break
            for item in items:
                if len(results) >= max_items: break
                _stat("Zenodo", "items_seen")
                try:
                    meta  = item.get("metadata", {})
                    title = meta.get("title","") or ""
                    desc  = meta.get("description","") or ""
                    desc  = re.sub(r"<[^>]+>"," ",desc)
                    desc  = re.sub(r"\s+"," ",desc).strip()
                    kws_meta = meta.get("keywords",[]) or []
                    kws_str  = " ".join(str(k) for k in kws_meta[:10])
                    combined = f"{title} {desc[:200]} {kws_str}"
                    if not is_health(combined):
                        _stat("Zenodo", "items_not_health"); continue
                    doi  = item.get("doi","") or meta.get("doi","")
                    link = f"https://doi.org/{doi}" if doi else f"https://zenodo.org/record/{item.get('id','')}"
                    if not link or link in seen:
                        _stat("Zenodo", "items_dup"); continue
                    seen.add(link)
                    creators     = meta.get("creators",[]) or []
                    creator_names= ", ".join(c.get("name","") for c in creators[:3])
                    files = item.get("files",[]) or []
                    exts  = {Path(f.get("key",f.get("filename",""))).suffix.lower().strip(".").upper() for f in files[:5]}
                    fmt   = ", ".join(sorted(exts)[:3]) if exts else detect_format(combined)
                    lang_code = meta.get("language","en") or "en"
                    row = empty_row()
                    row["Nombre del dataset"]    = title
                    row["Área médica"]           = classify_area(combined)
                    row["Tipo de datos"]         = classify_type(combined)
                    row["Fuente"]                = "Zenodo"
                    row["Autor / Institución"]   = creator_names
                    row["Tipo de formato"]       = fmt
                    row["Variables principales"] = ", ".join(str(k) for k in kws_meta[:5])
                    row["Año publicación"]       = extract_year(meta.get("publication_date",""))
                    row["Link"]                  = link
                    row["Idioma"]                = LANG_MAP.get(lang_code, lang_code)
                    row["Breve descripción"]     = desc[:300]
                    row["Propuesta / Objetivo"]  = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                    row["Observaciones"]         = f"DOI: {doi}" if doi else ""
                    results.append(row)
                    _stat("Zenodo", "items_ok")
                except Exception as e:
                    _stat("Zenodo", "items_error")
                    log.debug(f"Zenodo parse error ({type(e).__name__}): {e}")
                    continue
            if len(items) < 50: break
            page += 1; time.sleep(0.5)
    # Pase adicional: datasets en español
    if len(results) < max_items:
        es_terms = ["salud","clinica","paciente","enfermedad","epidemiologia","diagnostico"]
        for term in es_terms:
            if len(results) >= max_items: break
            data = safe_get(base_url,
                            params={"q": f'{term} language:"spa"', "size": 50, "page": 1,
                                    "sort": "newest"},
                            headers=zenodo_headers)
            if not data: continue
            for item in (data.get("hits", {}).get("hits", [])):
                if len(results) >= max_items: break
                _stat("Zenodo", "items_seen")
                try:
                    meta  = item.get("metadata", {})
                    title = meta.get("title","") or ""
                    desc  = meta.get("description","") or ""
                    desc  = re.sub(r"<[^>]+>"," ",desc); desc = re.sub(r"\s+"," ",desc).strip()
                    kws_meta = meta.get("keywords",[]) or []
                    kws_str  = " ".join(str(k) for k in kws_meta[:10])
                    combined = f"{title} {desc[:200]} {kws_str}"
                    if not is_health(combined): _stat("Zenodo","items_not_health"); continue
                    doi  = item.get("doi","") or meta.get("doi","")
                    link = f"https://doi.org/{doi}" if doi else f"https://zenodo.org/record/{item.get('id','')}"
                    if not link or link in seen: _stat("Zenodo","items_dup"); continue
                    seen.add(link)
                    creators      = meta.get("creators",[]) or []
                    creator_names = ", ".join(c.get("name","") for c in creators[:3])
                    files = item.get("files",[]) or []
                    exts  = {Path(f.get("key",f.get("filename",""))).suffix.lower().strip(".").upper() for f in files[:5]}
                    fmt   = ", ".join(sorted(exts)[:3]) if exts else detect_format(combined)
                    row = empty_row()
                    row["Nombre del dataset"]    = title
                    row["Área médica"]           = classify_area(combined)
                    row["Tipo de datos"]         = classify_type(combined)
                    row["Fuente"]                = "Zenodo"
                    row["Autor / Institución"]   = creator_names
                    row["Tipo de formato"]       = fmt
                    row["Variables principales"] = ", ".join(str(k) for k in kws_meta[:5])
                    row["Año publicación"]       = extract_year(meta.get("publication_date",""))
                    row["Link"]                  = link
                    row["Idioma"]                = "Español"
                    row["Breve descripción"]     = desc[:300]
                    row["Propuesta / Objetivo"]  = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                    row["Observaciones"]         = f"DOI: {doi}" if doi else ""
                    results.append(row)
                    _stat("Zenodo", "items_ok")
                except Exception as e:
                    _stat("Zenodo", "items_error")
                    log.debug(f"Zenodo ES parse error ({type(e).__name__}): {e}")
    log.info(f"Zenodo: {len(results)} datasets")
    return results

# ── Hugging Face ──────────────────────────────────────────────
def scrape_huggingface(max_items: int) -> List[Dict]:
    log.info("=== HUGGING FACE ===")
    results, seen = [], set()
    base_url = "https://huggingface.co/api/datasets"
    hf_token = CONFIG.get("hf_token")
    # Token sube rate limit de ~100 a ~1000 req/h. Pasado por request,
    # no mutado en SESSION (race con otras fuentes paralelas).
    hf_headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else None
    if not hf_token:
        log.info("HUGGINGFACE_TOKEN no configurado (anon: ~100 req/h).")
    search_terms = ["medical","clinical","health","disease","radiology","genomic","EHR","biomedical"]
    for term in search_terms:
        if len(results) >= max_items: break
        offset = 0
        for _ in range(5):
            if len(results) >= max_items: break
            data = safe_get(base_url,
                            params={"search":term,"limit":100,"offset":offset,"sort":"downloads","direction":-1},
                            headers=hf_headers)
            if not data or not isinstance(data, list): break
            for item in data:
                if len(results) >= max_items: break
                _stat("Hugging Face", "items_seen")
                try:
                    dataset_id  = item.get("id","") or ""
                    name        = dataset_id.split("/")[-1] if "/" in dataset_id else dataset_id
                    description = item.get("description","") or ""
                    tags        = item.get("tags",[]) or []
                    tags_str    = " ".join(str(t) for t in tags[:20])
                    combined    = f"{name} {description} {tags_str}"
                    if not is_health(combined):
                        _stat("Hugging Face", "items_not_health"); continue
                    link = f"https://huggingface.co/datasets/{dataset_id}" if dataset_id else ""
                    if not link or link in seen:
                        _stat("Hugging Face", "items_dup"); continue
                    seen.add(link)
                    author = dataset_id.split("/")[0] if "/" in dataset_id else ""
                    lang   = "Inglés"
                    for t in tags:
                        if str(t).startswith("language:"):
                            lang = LANG_MAP.get(str(t).replace("language:",""), lang); break
                    downloads = item.get("downloads",0) or 0
                    likes     = item.get("likes",0) or 0
                    row = empty_row()
                    row["Nombre del dataset"]  = name
                    row["Área médica"]         = classify_area(combined)
                    row["Tipo de datos"]       = classify_type(combined)
                    row["Fuente"]              = "Hugging Face Hub"
                    row["Autor / Institución"] = author
                    row["Tipo de formato"]     = detect_format(tags_str)
                    row["Año publicación"]     = extract_year(item.get("lastModified") or item.get("updatedAt",""))
                    row["Link"]                = link
                    row["Idioma"]              = lang
                    row["Breve descripción"]   = description[:300]
                    row["Propuesta / Objetivo"] = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                    row["Observaciones"]       = f"Downloads: {downloads:,} | Likes: {likes}"
                    hf_count = _hf_size_to_count(tags)
                    if hf_count:
                        row["Cant. registros"] = str(hf_count)
                    results.append(row)
                    _stat("Hugging Face", "items_ok")
                except Exception as e:
                    _stat("Hugging Face", "items_error")
                    log.debug(f"HuggingFace parse error ({type(e).__name__}): {e}")
                    continue
            if len(data) < 100: break
            offset += 100
    # Pase adicional: datasets en español (language:es)
    if len(results) < max_items:
        es_terms = ["salud","clinica","paciente","enfermedad","diagnostico","salud publica","epidemiologia"]
        for term in es_terms:
            if len(results) >= max_items: break
            data = safe_get(base_url,
                            params={"search": term, "limit": 100, "filter": "language:es",
                                    "sort": "downloads", "direction": -1},
                            headers=hf_headers)
            if not data or not isinstance(data, list): continue
            for item in data:
                if len(results) >= max_items: break
                _stat("Hugging Face", "items_seen")
                try:
                    dataset_id  = item.get("id","") or ""
                    name        = dataset_id.split("/")[-1] if "/" in dataset_id else dataset_id
                    description = item.get("description","") or ""
                    tags        = item.get("tags",[]) or []
                    tags_str    = " ".join(str(t) for t in tags[:20])
                    combined    = f"{name} {description} {tags_str}"
                    if not is_health(combined): _stat("Hugging Face","items_not_health"); continue
                    link = f"https://huggingface.co/datasets/{dataset_id}" if dataset_id else ""
                    if not link or link in seen: _stat("Hugging Face","items_dup"); continue
                    seen.add(link)
                    author    = dataset_id.split("/")[0] if "/" in dataset_id else ""
                    downloads = item.get("downloads",0) or 0
                    likes     = item.get("likes",0) or 0
                    row = empty_row()
                    row["Nombre del dataset"]  = name
                    row["Área médica"]         = classify_area(combined)
                    row["Tipo de datos"]       = classify_type(combined)
                    row["Fuente"]              = "Hugging Face Hub"
                    row["Autor / Institución"] = author
                    row["Tipo de formato"]     = detect_format(tags_str)
                    row["Año publicación"]     = extract_year(item.get("lastModified") or item.get("updatedAt",""))
                    row["Link"]                = link
                    row["Idioma"]              = "Español"
                    row["Breve descripción"]   = description[:300]
                    row["Propuesta / Objetivo"] = _auto_propuesta(row["Área médica"], row["Tipo de datos"])
                    row["Observaciones"]       = f"Downloads: {downloads:,} | Likes: {likes}"
                    hf_count = _hf_size_to_count(tags)
                    if hf_count: row["Cant. registros"] = str(hf_count)
                    results.append(row)
                    _stat("Hugging Face", "items_ok")
                except Exception as e:
                    _stat("Hugging Face", "items_error")
                    log.debug(f"HuggingFace ES parse error ({type(e).__name__}): {e}")
    log.info(f"Hugging Face: {len(results)} datasets")
    return results

# ═══════════════════════════════════════════════════════════════
# LOAD EXISTING EXCEL
# ═══════════════════════════════════════════════════════════════
def load_base() -> List[Dict]:
    fpath = CONFIG["base_file"]
    if not Path(fpath).exists():
        log.warning(f"Base no encontrada: {fpath} — arrancando desde cero")
        return []
    try:
        xl    = pd.ExcelFile(fpath)
        sheet = next((s for s in xl.sheet_names if "dataset" in s.lower()), xl.sheet_names[0])
        probe = pd.read_excel(fpath, sheet_name=sheet, nrows=1, header=None)
        first = str(probe.iloc[0, 0]).strip() if not probe.empty else ""
        hrow  = 1 if ("REPOSITORIO" in first.upper() or len(first) > 30) else 0
        df    = pd.read_excel(fpath, sheet_name=sheet, header=hrow, dtype=str).dropna(how="all")
        df.columns = [COLUMN_ALIASES.get(str(c).strip(), str(c).strip()) for c in df.columns]
        log.info(f"Base cargada: {len(df)} filas de '{sheet}'")
        records = []
        for _, row in df.iterrows():
            r = empty_row()
            for col in COLS:
                val = row.get(col, "")
                r[col] = "" if pd.isna(val) else str(val).strip()
            if not r.get("Nombre del dataset"):
                continue
            if not r.get("Fuente"):
                r["Fuente"] = "Carga manual"
            records.append(r)
        log.info(f"Datasets base válidos: {len(records)}")
        return records
    except Exception as e:
        log.error(f"Error cargando base: {e}")
        return []

# ═══════════════════════════════════════════════════════════════
# DEDUPLICACIÓN
# ═══════════════════════════════════════════════════════════════
def deduplicate(datasets: List[Dict]) -> List[Dict]:
    seen_links, seen_names, unique = set(), set(), []
    for ds in datasets:
        link = (ds.get("Link") or "").strip()
        name = re.sub(r"\s+", " ", (ds.get("Nombre del dataset") or "").strip().lower())
        if link and link in seen_links: continue
        if name and name in seen_names: continue
        if link: seen_links.add(link)
        if name: seen_names.add(name)
        unique.append(ds)
    return unique

# ═══════════════════════════════════════════════════════════════
# YEAR UPDATERS (Año actualización)
# ═══════════════════════════════════════════════════════════════
def _fetch_kaggle_update(link: str) -> Tuple[Optional[int], str]:
    try:
        parts = [p for p in urlparse(link).path.strip("/").split("/") if p]
        idx   = parts.index("datasets")
        owner, slug = parts[idx+1], parts[idx+2]
    except (ValueError, IndexError):
        return None, "bad_kaggle_url"
    if KAGGLE_AUTH_TYPE is None:
        return None, "no_kaggle_auth"
    # El endpoint público `view` acepta Basic con (username, key) de kaggle.json.
    url = f"https://www.kaggle.com/api/v1/datasets/view/{owner}/{slug}"
    kw: dict = {"timeout": CONFIG["request_timeout"]}
    if KAGGLE_AUTH_TYPE == "basic":
        kw["auth"] = KAGGLE_AUTH_CREDS
    else:
        kw["headers"] = {"Authorization": f"Bearer {KAGGLE_AUTH_CREDS}"}
    try:
        r = SESSION.get(url, **kw)
        r.raise_for_status()
        data = r.json()
        y = _to_year(data.get("lastUpdated") or data.get("lastPublished"))
        return y, "ok" if y else "no_date"
    except requests.Timeout:
        return None, "timeout"
    except requests.HTTPError as e:
        code = getattr(getattr(e, "response", None), "status_code", "?")
        return None, f"http_{code}"
    except Exception as e:
        return None, f"error:{type(e).__name__}"

def _fetch_uci_update(link: str) -> Tuple[Optional[int], str]:
    """UCI nueva (`/dataset/<id>`) → API JSON.
    UCI vieja (`/ml/datasets/<Name>`) → no hay API equivalente, marcar explícito."""
    m_new = re.search(r"/dataset/(\d+)", link)
    if m_new:
        try:
            r = SESSION.get("https://archive.ics.uci.edu/api/dataset",
                            params={"id": m_new.group(1)},
                            timeout=CONFIG["request_timeout"])
            r.raise_for_status()
            data = r.json().get("data", {}) or {}
            y = _to_year(data.get("last_updated") or data.get("date_donated"))
            return y, "ok" if y else "no_date"
        except requests.Timeout:
            return None, "timeout"
        except requests.HTTPError as e:
            code = getattr(getattr(e, "response", None), "status_code", "?")
            return None, f"http_{code}"
        except Exception as e:
            return None, f"error:{type(e).__name__}"
    if "/ml/datasets/" in link:
        return None, "legacy_uci_no_api"
    return None, "unsupported_uci_format"

def _fetch_healthdata_update(link: str) -> Tuple[Optional[int], str]:
    try:
        parsed = urlparse(link)
        m = re.search(r"([a-z0-9]{4}-[a-z0-9]{4})", parsed.path)
        if not m: return None, "no_id"
        r = SESSION.get(f"https://{parsed.netloc or 'healthdata.gov'}/api/views/{m.group(1)}.json",
                        timeout=CONFIG["request_timeout"]); r.raise_for_status()
        data = r.json()
        ts = data.get("rowsUpdatedAt") or data.get("updatedAt") or data.get("publicationDate")
        y = _to_year(ts)
        return y, "ok" if y else "no_date"
    except requests.Timeout:
        return None, "timeout"
    except Exception as e:
        return None, f"error:{type(e).__name__}"

def _fetch_physionet_update(link: str) -> Tuple[Optional[int], str]:
    try:
        m = re.search(r"/content/([a-z0-9][a-z0-9\-]+)/", link)
        if not m: return None, "no_slug"
        r = SESSION.get(f"https://physionet.org/api/v1/project/{m.group(1)}/",
                        timeout=CONFIG["request_timeout"]); r.raise_for_status()
        data = r.json()
        y = _to_year(data.get("modified_date") or data.get("publish_date"))
        return y, "ok" if y else "no_date"
    except requests.Timeout:
        return None, "timeout"
    except Exception as e:
        return None, f"error:{type(e).__name__}"

def _fetch_zenodo_update(link: str) -> Tuple[Optional[int], str]:
    try:
        record_id = None
        m = re.search(r"zenodo\.org/(?:records?)/(\d+)", link)
        if m: record_id = m.group(1)
        else:
            m = re.search(r"zenodo[./](\d{5,})", link)
            if m: record_id = m.group(1)
        if not record_id: return None, "no_id"
        token = CONFIG.get("zenodo_token")
        hdrs  = {"Authorization": f"Bearer {token}"} if token else {}
        r = SESSION.get(f"https://zenodo.org/api/records/{record_id}",
                        headers=hdrs, timeout=CONFIG["request_timeout"]); r.raise_for_status()
        data = r.json()
        y = _to_year(data.get("updated") or data.get("created"))
        return y, "ok" if y else "no_date"
    except requests.Timeout:
        return None, "timeout"
    except Exception as e:
        return None, f"error:{type(e).__name__}"

def _fetch_hf_update(link: str) -> Tuple[Optional[int], str]:
    try:
        m = re.search(r"huggingface\.co/datasets/([^/\s?#]+/[^/\s?#]+)", link)
        if not m: return None, "no_id"
        hf_token = CONFIG.get("hf_token")
        hdrs = {"Authorization": f"Bearer {hf_token}"} if hf_token else None
        r = SESSION.get(f"https://huggingface.co/api/datasets/{m.group(1)}",
                        headers=hdrs, timeout=CONFIG["request_timeout"])
        r.raise_for_status()
        data = r.json()
        y = _to_year(data.get("lastModified") or data.get("updatedAt"))
        return y, "ok" if y else "no_date"
    except requests.Timeout:
        return None, "timeout"
    except requests.HTTPError as e:
        code = getattr(getattr(e, "response", None), "status_code", "?")
        return None, f"http_{code}"
    except Exception as e:
        return None, f"error:{type(e).__name__}"

def fetch_update_year(row: Dict) -> Tuple[Optional[int], str, str]:
    fuente = str(row.get("Fuente","") or "").lower()
    link   = str(row.get("Link","") or "").strip()
    if not link or link in ("nan","None",""): return None, "", "no_link"
    if "kaggle" in fuente or "kaggle.com" in link:
        y, s = _fetch_kaggle_update(link);   return y, "Kaggle API", s
    if "healthdata" in fuente or "healthdata.gov" in link or "data.cdc" in link:
        y, s = _fetch_healthdata_update(link); return y, "Socrata API", s
    if "physionet" in fuente or "physionet.org" in link:
        y, s = _fetch_physionet_update(link); return y, "PhysioNet API", s
    if "zenodo" in fuente or "zenodo.org" in link or "10.5281/zenodo" in link:
        y, s = _fetch_zenodo_update(link);    return y, "Zenodo API", s
    if "hugging face" in fuente or "huggingface.co" in link:
        y, s = _fetch_hf_update(link);        return y, "HuggingFace API", s
    if "uci" in fuente or "archive.ics.uci.edu" in link:
        y, s = _fetch_uci_update(link);       return y, "UCI API", s
    return None, "", "unsupported_source"

# ═══════════════════════════════════════════════════════════════
# CHECKPOINT
# ═══════════════════════════════════════════════════════════════
def load_checkpoint() -> Dict[str, Tuple[Optional[int], str, str]]:
    fpath = CONFIG["checkpoint"]
    if not Path(fpath).exists(): return {}
    result: Dict[str, Tuple[Optional[int], str, str]] = {}
    try:
        with open(fpath, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                key  = row["key"]
                year = int(row["año_actualizacion"]) if row.get("año_actualizacion") else None
                result[key] = (year, row.get("fuente_año",""), row.get("status",""))
    except Exception as e:
        log.warning(f"Checkpoint corrupto, ignorando: {e}")
    return result

def save_checkpoint(data: Dict[str, Tuple[Optional[int], str, str]]):
    with open(CONFIG["checkpoint"], "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["key","año_actualizacion","fuente_año","status"])
        for key, (year, src, status) in data.items():
            w.writerow([key, year if year is not None else "", src, status])

def _ckpt_key(row: Dict) -> str:
    return (row.get("Link") or row.get("Nombre del dataset") or "").strip()

# ═══════════════════════════════════════════════════════════════
# RELEVANCIA
# ═══════════════════════════════════════════════════════════════
def classify_relevance(row: Dict) -> str:
    name   = str(row.get("Nombre del dataset","") or "").lower()
    fuente = str(row.get("Fuente","") or "").lower()
    if any(kw in name for kw in CLASSIC_NAMES) or "physionet" in fuente:
        return "Clásico"
    cutoff = CONFIG["year_cutoff"]
    año_pub = parse_year(row.get("Año publicación"))
    año_act = parse_year(row.get("Año actualización"))
    if (año_act and año_act >= cutoff) or (año_pub and año_pub >= cutoff):
        return "Reciente"
    return "Antiguo"

# ═══════════════════════════════════════════════════════════════
# CALIDAD DE DATOS — score de completitud por fila
# ═══════════════════════════════════════════════════════════════
COMPLETENESS_WEIGHTS = {
    "Nombre del dataset":     10,
    "Link":                   10,
    "Fuente":                  5,
    "Área médica":             8,
    "Tipo de datos":           8,
    "Año publicación":         8,
    "Año actualización":       6,
    "Autor / Institución":     5,
    "Breve descripción":       8,
    "Tipo de formato":         4,
    "Cant. registros":         4,
    "Cant. variables":         4,
    "País":                    3,
    "Idioma":                  3,
    "Variables principales":   5,
    "Propuesta / Objetivo":    5,
    "Observaciones":           2,
    "Integrante responsable":  2,
}
_COMPLETENESS_TOTAL = sum(COMPLETENESS_WEIGHTS.values())

def completeness_score(row: Dict) -> int:
    got = sum(w for k, w in COMPLETENESS_WEIGHTS.items() if str(row.get(k, "") or "").strip())
    return int(round(got * 100 / _COMPLETENESS_TOTAL))

# ═══════════════════════════════════════════════════════════════
# EXCEL WRITER
# ═══════════════════════════════════════════════════════════════
HDR_FILL  = PatternFill("solid", fgColor="00695C")
ODD_FILL  = PatternFill("solid", fgColor="FFFFFF")
EVEN_FILL = PatternFill("solid", fgColor="E0F2F1")
HDR_FONT  = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
DAT_FONT  = Font(name="Calibri", size=10)
LNK_FONT  = Font(name="Calibri", size=10, color="0563C1", underline="single")
THIN      = Side(style="thin", color="B2DFDB")
BORDER    = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
TOP_AL    = Alignment(vertical="top", wrap_text=True)
CTR_AL    = Alignment(horizontal="center", vertical="center", wrap_text=True)
NUM_AL    = Alignment(horizontal="right", vertical="top")

COL_WIDTHS = {
    "Nro":5,"Nombre del dataset":40,"Área médica":22,"Tipo de datos":22,
    "Fuente":16,"Autor / Institución":28,"País":10,"Cant. registros":13,
    "Tipo de formato":20,"Variables principales":32,"Cant. variables":10,
    "Año publicación":10,"Año actualización":12,"Link":50,"Idioma":10,
    "Breve descripción":52,"Propuesta / Objetivo":42,"Observaciones":32,
    "Integrante responsable":18,
}
INT_COLS  = {"Nro","Cant. registros","Cant. variables"}
YEAR_COLS = {"Año publicación","Año actualización"}

def write_excel(datasets: List[Dict], relevance_map: Dict[str, str]):
    wb = Workbook()

    # ── Hoja DATASETS ──────────────────────────────────────────
    ws = wb.active
    ws.title = "DATASETS - SALUD"
    ws.sheet_view.showGridLines = False
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(COLS))
    t = ws.cell(1, 1, "REPOSITORIO DE DATASETS DE SALUD ≥ 2022 — CAETI UAI")
    t.font = Font(name="Calibri", bold=True, size=13, color="00695C")
    t.alignment = CTR_AL

    for ci, col in enumerate(COLS, 1):
        c = ws.cell(2, ci, col)
        c.fill=HDR_FILL; c.font=HDR_FONT; c.alignment=CTR_AL; c.border=BORDER

    for ri, ds in enumerate(datasets, 1):
        er   = ri + 2
        fill = EVEN_FILL if ri % 2 == 0 else ODD_FILL
        for ci, col in enumerate(COLS, 1):
            val  = ds.get(col)
            cell = ws.cell(er, ci)
            cell.fill=fill; cell.border=BORDER
            if col == "Nro":
                cell.value=ri; cell.font=DAT_FONT; cell.alignment=NUM_AL; cell.number_format="0"
            elif col in INT_COLS:
                cell.value=parse_int(val); cell.font=DAT_FONT; cell.alignment=NUM_AL; cell.number_format="0"
            elif col in YEAR_COLS:
                cell.value=parse_year(val); cell.font=DAT_FONT; cell.alignment=NUM_AL; cell.number_format="0"
            elif col == "Link" and val and str(val).startswith("http"):
                cell.value=str(val); cell.font=LNK_FONT; cell.alignment=TOP_AL; cell.hyperlink=str(val)
            else:
                cell.value="" if (val is None or (isinstance(val,float) and pd.isna(val))) else str(val)
                cell.font=DAT_FONT; cell.alignment=TOP_AL

    for ci, col in enumerate(COLS, 1):
        ws.column_dimensions[get_column_letter(ci)].width = COL_WIDTHS.get(col, 15)
    ws.row_dimensions[1].height=24; ws.row_dimensions[2].height=30
    ws.freeze_panes="A3"

    # ── Hoja RESUMEN ───────────────────────────────────────────
    ws2 = wb.create_sheet("RESUMEN")
    ws2.sheet_view.showGridLines = False

    def h(r,c,v):
        cell=ws2.cell(r,c,v); cell.fill=HDR_FILL; cell.font=HDR_FONT
        cell.alignment=CTR_AL; cell.border=BORDER
    def d(r,c,v):
        cell=ws2.cell(r,c,v); cell.font=DAT_FONT; cell.border=BORDER; cell.alignment=TOP_AL

    ri = 1
    ws2.cell(ri,1,"RESUMEN DEL REPOSITORIO").font=Font(name="Calibri",bold=True,size=13,color="00695C")
    ri += 2

    ws2.cell(ri,1,"Relevancia Temporal").font=Font(name="Calibri",bold=True,size=11); ri += 1
    h(ri,1,"Categoría"); h(ri,2,"Cantidad"); ri += 1
    rel_counts = Counter(relevance_map.values())
    for label in ["Reciente","Clásico","Antiguo"]:
        d(ri,1,label); d(ri,2,rel_counts.get(label,0)); ri += 1

    ri += 1
    ws2.cell(ri,1,"Por Área Médica").font=Font(name="Calibri",bold=True,size=11); ri += 1
    h(ri,1,"Área Médica"); h(ri,2,"Cantidad"); ri += 1
    area_counts = Counter(ds.get("Área médica","") for ds in datasets)
    for area, cnt in area_counts.most_common():
        d(ri,1,area); d(ri,2,cnt); ri += 1

    ri += 1
    ws2.cell(ri,1,"Por Fuente").font=Font(name="Calibri",bold=True,size=11); ri += 1
    h(ri,1,"Fuente"); h(ri,2,"Cantidad"); ri += 1
    for fuente, cnt in Counter(ds.get("Fuente","") for ds in datasets).most_common():
        d(ri,1,fuente); d(ri,2,cnt); ri += 1

    ws2.column_dimensions["A"].width=38; ws2.column_dimensions["B"].width=12

    fpath = CONFIG["output_file"]
    wb.save(fpath)
    log.info(f"Guardado: {fpath}")

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def main():
    print("\n" + "="*62)
    print("  CAETI UAI -- Repositorio de Datasets de Salud >= 2022")
    print("="*62 + "\n")

    # 1. Cargar base existente
    base = load_base()
    print(f"Base cargada: {len(base)} datasets\n")

    # 2. Scraping de nuevas fuentes
    scraped: List[Dict] = []
    if CONFIG["run_scraping"]:
        max_n    = CONFIG["max_per_source"]
        keywords = CONFIG["keywords"]
        active   = [
            ("kaggle",         scrape_kaggle,         "Kaggle"),
            ("physionet",      scrape_physionet,       "PhysioNet"),
            ("uci",            scrape_uci,             "UCI"),
            ("healthdata_gov", scrape_healthdata_gov,  "HealthData.gov"),
            ("zenodo",         scrape_zenodo,          "Zenodo"),
            ("huggingface",    scrape_huggingface,     "Hugging Face"),
        ]
        skipped = [label for key,_,label in active if not CONFIG["sources"].get(key)]
        running = [(key,fn,label) for key,fn,label in active if CONFIG["sources"].get(key)]
        for label in skipped: print(f"[SKIP] {label}")
        print(f"\nScraping {len(running)} fuentes en paralelo...\n")
        from concurrent.futures import ThreadPoolExecutor as TPE, as_completed as ac
        with TPE(max_workers=len(running)) as ex:
            futs = {ex.submit(fn, max_n): label for _,fn,label in running}
            for f in ac(futs):
                label = futs[f]
                try:
                    res = f.result(); scraped.extend(res)
                    print(f"  [OK] {label:<20} +{len(res):>4} datasets")
                except Exception as e:
                    log.error(f"{label}: {e}"); print(f"  [ERR] {label}: {e}")
        print()
    else:
        print("[SKIP] Scraping desactivado (run_scraping=False)\n")

    # 3. Merge + deduplicar
    all_data  = deduplicate(base + scraped)
    new_count = len(all_data) - len(base)
    print(f"Total tras dedup: {len(all_data)} datasets (+{new_count} nuevos)\n")

    # 4. Fetch "Año actualización" en paralelo con checkpoint
    checkpoint = load_checkpoint()
    log.info(f"Checkpoint: {len(checkpoint)} filas ya procesadas")
    pending = [i for i, ds in enumerate(all_data) if _ckpt_key(ds) not in checkpoint]
    log.info(f"Filas a consultar: {len(pending)} / {len(all_data)}")

    # Aplicar checkpoint
    for ds in all_data:
        key = _ckpt_key(ds)
        if key in checkpoint:
            year, _, _ = checkpoint[key]
            ds["Año actualización"] = str(year) if year is not None else ""

    proc_since_ckpt = 0
    if pending:
        print(f"Consultando APIs para {len(pending)} datasets ({CONFIG['update_workers']} workers)...\n")
        with ThreadPoolExecutor(max_workers=CONFIG["update_workers"]) as ex:
            futs = {ex.submit(fetch_update_year, all_data[i]): i for i in pending}
            done = 0
            for f in as_completed(futs):
                i = futs[f]
                try:
                    year, api_label, status = f.result()
                    key = _ckpt_key(all_data[i])
                    all_data[i]["Año actualización"] = str(year) if year is not None else ""
                    checkpoint[key] = (year, api_label, status)
                    done += 1; proc_since_ckpt += 1
                    if done % 100 == 0: print(f"  {done}/{len(pending)} procesados...")
                    if proc_since_ckpt >= CONFIG["checkpoint_every"]:
                        save_checkpoint(checkpoint); proc_since_ckpt = 0
                except Exception as e:
                    log.warning(f"Error en future: {e}")
        save_checkpoint(checkpoint)
        print(f"  {len(pending)}/{len(pending)} procesados.\n")

    # 5. Clasificar relevancia
    relevance_map = {_ckpt_key(ds): classify_relevance(ds) for ds in all_data}
    for ds in all_data:
        ds["_relevancia"] = relevance_map[_ckpt_key(ds)]

    counts_total = Counter(ds["_relevancia"] for ds in all_data)
    print("Relevancia temporal (sobre todos los datos):")
    for label in ["Reciente","Clásico","Antiguo"]:
        print(f"  {label:<10}: {counts_total.get(label,0):>5}")
    print()

    # 6. Filtrar: solo Reciente + Clásico
    filtered = [ds for ds in all_data if ds["_relevancia"] in ("Reciente","Clásico")]
    print(f"Datasets en el output (Reciente + Clásico): {len(filtered)}")
    print(f"Datasets excluidos (Antiguo): {counts_total.get('Antiguo',0)}\n")

    # 7. Verificar columnas (raise, no assert — sobrevive a `python -O`)
    for col in COLS:
        for ds in filtered:
            if col not in ds:
                ds[col] = ""
    if len(COLS) != 19:
        raise ValueError(f"Se esperaban 19 columnas, hay {len(COLS)}")
    log.info(f"Verificación OK: 19 columnas, {len(filtered)} filas")

    # 8. Escribir Excel
    rel_filtered = {_ckpt_key(ds): ds["_relevancia"] for ds in filtered}
    write_excel(filtered, rel_filtered)

    # 9. Escribir log CSV
    log_rows = []
    for ds in all_data:
        key  = _ckpt_key(ds)
        year_act, api_label, status = checkpoint.get(key, (None,"","not_processed"))
        log_rows.append({
            "nombre":            str(ds.get("Nombre del dataset",""))[:60],
            "fuente":            ds.get("Fuente",""),
            "año_publicacion":   parse_year(ds.get("Año publicación")) or "",
            "año_actualizacion": year_act or "",
            "fuente_año":        api_label,
            "status":            status,
            "relevancia":        ds.get("_relevancia",""),
            "link":              str(ds.get("Link",""))[:100],
        })
    with open(CONFIG["log_csv"], "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=log_rows[0].keys())
        w.writeheader(); w.writerows(log_rows)
    log.info(f"Log guardado: {CONFIG['log_csv']} ({len(log_rows)} entradas)")

    # 10. Reporte QA (stdout + markdown persistente)
    qa_report(all_data, filtered, checkpoint)

    print("="*62)
    print(f"Output    : {CONFIG['output_file']}")
    print(f"Log CSV   : {CONFIG['log_csv']}")
    print(f"QA Report : {CONFIG['qa_report']}")
    print(f"Datasets en el repositorio final: {len(filtered)}")
    print("="*62 + "\n")


# ═══════════════════════════════════════════════════════════════
# QA REPORT
# ═══════════════════════════════════════════════════════════════
def qa_report(all_data: List[Dict], filtered: List[Dict],
              checkpoint: Dict[str, Tuple[Optional[int], str, str]]) -> None:
    """Imprime resumen QA por stdout y persiste markdown en `CONFIG['qa_report']`.

    Cubre: éxito/error de scraping por fuente, cobertura del enriquecimiento de
    Año actualización, distribución de relevancia, completitud, áreas y formatos.
    """
    lines: List[str] = []
    p = lambda s="": (print(s), lines.append(s))

    p("\n" + "="*62)
    p(f"# QA REPORT — {datetime.now().isoformat(timespec='seconds')}")
    p("="*62)

    p(f"\nTotal datasets en pipeline: {len(all_data)}")
    p(f"Total datasets en output  : {len(filtered)}")

    # ── Scraping ─────────────────────────────────────────────
    if RUN_STATS:
        p("\n## Scraping por fuente")
        p(f"{'Fuente':<18} {'seen':>6} {'ok':>6} {'dup':>6} {'!health':>8} {'error':>6}")
        for source in sorted(RUN_STATS):
            s = RUN_STATS[source]
            p(f"{source:<18} {s['items_seen']:>6} {s['items_ok']:>6} "
              f"{s['items_dup']:>6} {s['items_not_health']:>8} {s['items_error']:>6}")

    # ── Enriquecimiento update_year ───────────────────────────
    by_src = defaultdict(Counter)
    for ds in all_data:
        fuente = (ds.get("Fuente") or "desconocida").split(" / ")[0].split("(")[0].strip() or "desconocida"
        _, _, status = checkpoint.get(_ckpt_key(ds), (None, "", "not_processed"))
        by_src[fuente]["total"] += 1
        if status == "ok":
            by_src[fuente]["ok"] += 1
        elif status.startswith("http_") or status.startswith("error:"):
            by_src[fuente]["err"] += 1
        else:
            by_src[fuente]["skip"] += 1

    p("\n## Cobertura 'Año actualización' (Top 12 fuentes)")
    p(f"{'Fuente':<32} {'total':>6} {'ok':>6} {'err':>6} {'skip':>6} {'%ok':>6}")
    top = sorted(by_src.items(), key=lambda kv: -kv[1]["total"])[:12]
    for fuente, c in top:
        pct = 100 * c["ok"] / c["total"] if c["total"] else 0
        flag = " (!)" if c["err"] > c["ok"] and c["total"] > 5 else ""
        p(f"{fuente[:32]:<32} {c['total']:>6} {c['ok']:>6} {c['err']:>6} {c['skip']:>6} {pct:>5.0f}%{flag}")

    # ── Relevancia ───────────────────────────────────────────
    rel = Counter(ds.get("_relevancia","") for ds in all_data)
    p("\n## Relevancia temporal")
    for label in ["Reciente","Clásico","Antiguo"]:
        p(f"  {label:<10} {rel.get(label,0):>5}")

    # ── Completitud ──────────────────────────────────────────
    scores = [completeness_score(ds) for ds in filtered]
    if scores:
        avg = sum(scores) / len(scores)
        buckets = Counter()
        for s in scores:
            if   s >= 80: buckets["80-100"] += 1
            elif s >= 60: buckets["60-79"]  += 1
            elif s >= 40: buckets["40-59"]  += 1
            else:         buckets["0-39"]   += 1
        p(f"\n## Completitud (filas del output)  avg={avg:.0f}/100")
        for bucket in ["80-100","60-79","40-59","0-39"]:
            p(f"  {bucket:<8} {buckets.get(bucket,0):>5}")

    # ── Áreas médicas (top) ───────────────────────────────────
    areas = Counter(ds.get("Área médica","") for ds in filtered)
    p("\n## Top áreas médicas (output)")
    for area, n in areas.most_common(10):
        p(f"  {area[:36]:<36} {n:>5}")

    # ── Persistir ────────────────────────────────────────────
    try:
        Path(CONFIG["qa_report"]).write_text("\n".join(lines), encoding="utf-8")
    except OSError as e:
        log.warning(f"No se pudo escribir QA report: {e}")


if __name__ == "__main__":
    main()

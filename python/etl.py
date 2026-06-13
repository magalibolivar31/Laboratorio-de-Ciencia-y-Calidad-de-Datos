#!/usr/bin/env python3
"""
etl.py — Motor de Búsqueda CAETI UAI (Multifuente Limpio)
Optimizado para el Backend.
"""

import csv, json, logging, os, re, sys, time, traceback, warnings
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import pandas as pd
import requests
from openpyxl import Workbook

# Carga de .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

warnings.filterwarnings("ignore")

# --- CONFIGURACIÓN DINÁMICA ---
custom_keywords = sys.argv[1:] if len(sys.argv) > 1 else []
if custom_keywords:
    search_keywords = custom_keywords
else:
    search_keywords = ["health", "medical", "salud"]

search_tag = "_".join(search_keywords[:3]).replace(" ", "_")
output_name = f"REPOSITORIO_{search_tag}_{int(time.time())}.xlsx"

CONFIG = {
    "output_file":  output_name,
    "max_per_source":  25,
    "keywords": search_keywords,
    "request_timeout":  7,
}

# --- HELPERS ---
def clean_html(text):
    if not text: return ""
    # Quitar etiquetas HTML
    clean = re.sub(r'<[^>]+>', '', str(text))
    # Normalizar espacios y saltos de línea
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def empty_row():
    return {
        "Nro": "", "Nombre del dataset": "", "Área médica": "General", 
        "Tipo de datos": "Clínico", "Fuente": "", "Autor / Institución": "N/A", 
        "País": "Global", "Cant. registros": "N/A", "Tipo de formato": "Varios", 
        "Variables principales": "N/A", "Cant. variables": "N/A", 
        "Año publicación": "", "Año actualización": "", "Link": "", 
        "Idioma": "Inglés", "Breve descripción": "", "Propuesta / Objetivo": "Investigación", 
        "Observaciones": "", "Integrante responsable": "Robot UAI"
    }

# --- SCRAPERS ---

def scrape_zenodo(max_items):
    results = []
    base_url = "https://zenodo.org/api/records"
    token = os.environ.get("ZENODO_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else None
    try:
        for term in CONFIG["keywords"][:2]:
            resp = requests.get(base_url, params={"q": term, "size": max_items}, headers=headers, timeout=CONFIG["request_timeout"])
            data = resp.json()
            for item in data.get("hits", {}).get("hits", []):
                meta = item.get("metadata", {})
                row = empty_row()
                row["Nombre del dataset"] = meta.get("title")
                row["Fuente"] = "Zenodo"
                row["Link"] = f"https://zenodo.org/record/{item.get('id')}"
                row["Año publicación"] = meta.get("publication_date")[:4] if meta.get("publication_date") else ""
                row["Breve descripción"] = clean_html(meta.get("description", ""))[:400]
                creators = meta.get("creators", [])
                row["Autor / Institución"] = creators[0].get("name") if creators else "N/A"
                results.append(row)
    except: pass
    return results

def scrape_huggingface(max_items):
    results = []
    base_url = "https://huggingface.co/api/datasets"
    try:
        for term in CONFIG["keywords"][:2]:
            resp = requests.get(base_url, params={"search": term, "limit": max_items}, timeout=CONFIG["request_timeout"])
            data = resp.json()
            for item in data:
                row = empty_row()
                row["Nombre del dataset"] = item.get("id")
                row["Fuente"] = "Hugging Face"
                row["Link"] = f"https://huggingface.co/datasets/{item.get('id')}"
                row["Breve descripción"] = clean_html(item.get("description", ""))[:400]
                row["Autor / Institución"] = item.get("id").split("/")[0] if "/" in item.get("id") else "N/A"
                results.append(row)
    except: pass
    return results

def scrape_kaggle(max_items):
    results = []
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        for term in CONFIG["keywords"][:2]:
            batch = api.dataset_list(search=term, sort_by="votes", page=1)
            for ds in batch[:max_items]:
                row = empty_row()
                row["Nombre del dataset"] = getattr(ds, "title", "")
                row["Fuente"] = "Kaggle"
                row["Link"] = f"https://www.kaggle.com/datasets/{getattr(ds, 'ref', '')}"
                row["Año publicación"] = str(getattr(ds, "lastUpdated", ""))[:4]
                row["Breve descripción"] = clean_html(getattr(ds, "subtitle", ""))[:400]
                row["Autor / Institución"] = getattr(ds, "ownerName", "N/A")
                results.append(row)
    except: pass
    return results

def scrape_uci(max_items):
    results = []
    list_url = "https://archive.ics.uci.edu/api/datasets/list"
    try:
        for term in CONFIG["keywords"][:2]:
            resp = requests.get(list_url, params={"search": term}, timeout=CONFIG["request_timeout"])
            data = resp.json()
            for item in (data.get("data") or [])[:max_items]:
                row = empty_row()
                row["Nombre del dataset"] = item.get("name")
                row["Fuente"] = "UCI ML Repository"
                row["Link"] = f"https://archive.ics.uci.edu/dataset/{item.get('id')}"
                row["Breve descripción"] = f"Dataset de UCI sobre {item.get('area', 'salud')}."
                results.append(row)
    except: pass
    return results

def scrape_healthdata(max_items):
    results = []
    base_url = "https://healthdata.gov/api/catalog/v1"
    try:
        resp = requests.get(base_url, params={"only":"datasets", "limit": max_items}, timeout=CONFIG["request_timeout"])
        data = resp.json()
        for item in data.get("results", []):
            resource = item.get("resource", {})
            row = empty_row()
            row["Nombre del dataset"] = resource.get("name")
            row["Fuente"] = "HealthData.gov"
            row["Link"] = item.get("permalink") or item.get("link")
            row["Breve descripción"] = clean_html(resource.get("description", ""))[:400]
            results.append(row)
    except: pass
    return results

# --- MAIN ---
def main():
    try:
        print(f"Buscando en fuentes multifuente para: {CONFIG['keywords']}")
        all_results = []
        
        sources = [
            (scrape_zenodo, "Zenodo"),
            (scrape_huggingface, "Hugging Face"),
            (scrape_kaggle, "Kaggle"),
            (scrape_uci, "UCI"),
            (scrape_healthdata, "HealthData.gov")
        ]

        with ThreadPoolExecutor(max_workers=len(sources)) as executor:
            futs = {executor.submit(fn, CONFIG["max_per_source"]): name for fn, name in sources}
            for f in as_completed(futs):
                name = futs[f]
                try:
                    res = f.result()
                    all_results.extend(res)
                    print(f"  [OK] {name}: {len(res)} encontrados")
                except Exception as e:
                    print(f"  [ERR] {name}: {e}")

        if all_results:
            # Eliminar duplicados por Link
            seen = set()
            unique_results = []
            for r in all_results:
                if r["Link"] not in seen:
                    seen.add(r["Link"])
                    unique_results.append(r)
            
            # Asignar Nro final
            for i, r in enumerate(unique_results, 1):
                r["Nro"] = i
            
            df = pd.DataFrame(unique_results)
            # Reordenar columnas para que coincidan con el Excel oficial
            cols_order = [
                "Nro", "Nombre del dataset", "Área médica", "Tipo de datos", "Fuente", 
                "Autor / Institución", "País", "Cant. registros", "Tipo de formato", 
                "Variables principales", "Cant. variables", "Año publicación", 
                "Año actualización", "Link", "Idioma", "Breve descripción", 
                "Propuesta / Objetivo", "Observaciones", "Integrante responsable"
            ]
            df = df[cols_order]
            
            df.to_excel(CONFIG["output_file"], index=False)
            print(f"Guardado: {CONFIG['output_file']}")
        else:
            print("No se encontraron resultados.")

    except Exception as e:
        print(f"ERROR EN EL MOTOR: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

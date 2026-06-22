#!/usr/bin/env python3
"""
quality.py - QualityAI: motor de evaluacion automatica de calidad de datasets.

Uso:
    python quality.py <ruta_archivo> [--max-rows N]

Recibe un archivo (.csv o .xlsx), toma un sample representativo si es grande,
y devuelve por STDOUT un JSON con:
  - Quality Score 0-100 FORMALIZADO (ISO/IEC 25012), con desglose por dimension
    y la contribucion de cada una (transparente y reproducible).
  - Severidad unificada (ok / warning / critical) a partir de umbrales del config.
  - ML-readiness + perfiles de aptitud (fitness-for-use) por caso de uso.

Los pesos/umbrales viven en quality_config.json (versionados). Los logs van a
STDERR para no contaminar el JSON de STDOUT.
"""

import argparse
import hashlib
import json
import os
import sys
import warnings
from datetime import datetime, timezone

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

DEFAULT_MAX_ROWS = 50000
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quality_config.json")


def log(msg):
    print(f"[quality.py] {msg}", file=sys.stderr)


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def sha256_of_file(path):
    """Hash del contenido EXACTO que se analizo -> permite reproducir el resultado."""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def detect_sep(path):
    """Detecta el separador del CSV mirando la primera linea (coma, punto y coma,
    tab o pipe). Muchos CSV de gobierno/español usan ';' -> sin esto se leen como
    una sola columna."""
    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        header = fh.readline()
    candidates = {",": header.count(","), ";": header.count(";"),
                  "\t": header.count("\t"), "|": header.count("|")}
    best = max(candidates, key=candidates.get)
    return best if candidates[best] > 0 else ","


def load_sample(path, max_rows):
    """Carga el archivo tomando un sample aleatorio si supera max_rows.
    Devuelve (df, rows_total, rows_sampled)."""
    lower = path.lower()

    if lower.endswith((".csv", ".txt", ".tsv")):
        rows_total = 0
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            for _ in fh:
                rows_total += 1
        rows_total = max(rows_total - 1, 0)  # descontar header

        sep = "\t" if lower.endswith(".tsv") else detect_sep(path)
        if rows_total > max_rows:
            keep_prob = max_rows / rows_total
            rng = np.random.default_rng(42)
            skip = lambda i: i > 0 and rng.random() > keep_prob
            df = pd.read_csv(path, sep=sep, skiprows=skip, encoding="utf-8",
                             on_bad_lines="skip", low_memory=False)
        else:
            df = pd.read_csv(path, sep=sep, encoding="utf-8", on_bad_lines="skip", low_memory=False)
        return df, rows_total, len(df)

    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        df = pd.read_excel(path)
        rows_total = len(df)
        if rows_total > max_rows:
            df = df.sample(n=max_rows, random_state=42).reset_index(drop=True)
        return df, rows_total, len(df)

    raise ValueError(f"Formato no soportado: {path}")


def pct(part, whole):
    return round(100.0 * part / whole, 2) if whole else 0.0


def rate(value, thresholds):
    """Mapea un valor (higher_is_better) a severidad unificada usando los
    umbrales de la dimension. critical < critical_thr <= warning < warning_thr <= ok."""
    if value < thresholds["critical"]:
        return "critical"
    if value < thresholds["warning"]:
        return "warning"
    return "ok"


# ----------------------- Metricas crudas -----------------------

def raw_metrics(df):
    n_rows, n_cols = len(df), df.shape[1]
    total_cells = n_rows * n_cols

    missing_pct = pct(int(df.isna().sum().sum()), total_cells)
    dup_rows = int(df.duplicated().sum())
    dup_pct = pct(dup_rows, n_rows)

    # consistencia de tipos: fraccion dominante numerico/texto por columna
    fractions, mixed = [], []
    for col in df.columns:
        s = df[col].dropna()
        if s.empty:
            continue
        if pd.api.types.is_numeric_dtype(s):
            fractions.append(1.0)
            continue
        numeric_parse = pd.to_numeric(s.astype(str), errors="coerce").notna()
        num_frac = float(numeric_parse.mean())
        fractions.append(max(num_frac, 1 - num_frac))
        if min(num_frac, 1 - num_frac) > 0.05:
            mixed.append(str(col))
    type_consistency_pct = round(100.0 * float(np.mean(fractions)), 2) if fractions else 100.0

    # outliers (IsolationForest, fallback IQR)
    outliers_pct, n_outliers, eval_rows = detect_outliers(df)

    completeness_by_col = [
        {"column": str(c), "completenessPct": pct(df[c].notna().sum(), n_rows)}
        for c in df.columns
    ]

    return {
        "missingValuesPct": missing_pct,
        "duplicateRowsPct": dup_pct,
        "duplicateRows": dup_rows,
        "outliersPct": outliers_pct,
        "outlierRows": n_outliers,
        "outlierEvalRows": eval_rows,
        "typeConsistencyPct": type_consistency_pct,
        "mixedTypeColumns": mixed,
        "columnCompleteness": completeness_by_col,
    }


def detect_outliers(df):
    numeric = df.select_dtypes(include=[np.number]).dropna()
    if numeric.shape[0] < 20 or numeric.shape[1] == 0:
        return 0.0, 0, numeric.shape[0]
    try:
        from sklearn.ensemble import IsolationForest
        model = IsolationForest(contamination="auto", random_state=42, n_estimators=100)
        preds = model.fit_predict(numeric)
        n_out = int((preds == -1).sum())
        return pct(n_out, len(numeric)), n_out, len(numeric)
    except Exception as exc:
        log(f"IsolationForest no disponible ({exc}); uso IQR.")
        mask = pd.Series(False, index=numeric.index)
        for col in numeric.columns:
            q1, q3 = numeric[col].quantile(0.25), numeric[col].quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            mask |= (numeric[col] < q1 - 1.5 * iqr) | (numeric[col] > q3 + 1.5 * iqr)
        n_out = int(mask.sum())
        return pct(n_out, len(numeric)), n_out, len(numeric)


# ----------------------- Score formalizado (ISO 25012) -----------------------

def compute_dimensions(metrics, config):
    """Mapea metricas crudas a las 4 dimensiones ISO y calcula la contribucion
    de cada una al score final. Devuelve (dimensions[], quality_score)."""
    dim_values = {
        "completeness": round(100 - metrics["missingValuesPct"], 2),
        "consistency": metrics["typeConsistencyPct"],
        "accuracy": round(100 - metrics["outliersPct"], 2),
        "uniqueness": round(100 - metrics["duplicateRowsPct"], 2),
    }

    dimensions = []
    score = 0.0
    for key, cfg in config["dimensions"].items():
        value = dim_values[key]
        contribution = round(cfg["weight"] * value, 2)
        score += contribution
        dimensions.append({
            "id": key,
            "label": cfg["label"],
            "isoCharacteristic": cfg["isoCharacteristic"],
            "value": value,
            "weight": cfg["weight"],
            "contribution": contribution,
            "rating": rate(value, cfg["thresholds"]),
            "thresholds": cfg["thresholds"],
        })

    quality_score = int(round(max(0, min(100, score))))
    return dimensions, quality_score


def build_issues(dimensions, metrics, config):
    """Issues con severidad UNIFICADA, derivada del rating de cada dimension
    y de problemas por columna (no decidida ad-hoc)."""
    issues = []

    # por columna: completitud
    crit = config["dimensions"]["completeness"]["thresholds"]
    for c in metrics["columnCompleteness"]:
        sev = rate(c["completenessPct"], crit)
        if sev != "ok":
            issues.append({
                "severity": sev, "type": "missing_values", "column": c["column"],
                "detail": f"{round(100 - c['completenessPct'], 1)}% de valores faltantes",
            })

    # a nivel dataset: por cada dimension que no esta ok
    by_id = {d["id"]: d for d in dimensions}
    if by_id["uniqueness"]["rating"] != "ok":
        issues.append({
            "severity": by_id["uniqueness"]["rating"], "type": "duplicate_rows", "column": None,
            "detail": f"{metrics['duplicateRows']} filas duplicadas ({metrics['duplicateRowsPct']}%)",
        })
    if by_id["accuracy"]["rating"] != "ok":
        issues.append({
            "severity": by_id["accuracy"]["rating"], "type": "outliers", "column": None,
            "detail": f"{metrics['outlierRows']} registros atipicos de {metrics['outlierEvalRows']} evaluados (IsolationForest)",
        })
    for col in metrics["mixedTypeColumns"]:
        issues.append({
            "severity": by_id["consistency"]["rating"], "type": "type_inconsistency", "column": col,
            "detail": "mezcla tipos numerico y texto",
        })

    sev_order = {"critical": 0, "warning": 1, "low": 1, "ok": 2}
    issues.sort(key=lambda i: sev_order.get(i["severity"], 3))
    return issues


# ----------------------- ML-readiness / fitness-for-use -----------------------

def assess_ml_readiness(df, config):
    """Senales de aptitud para ML + perfiles interpretables por caso de uso."""
    p = config["mlReadiness"]
    n_rows, n_cols = len(df), df.shape[1]
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    # candidatos a target categorico (cardinalidad 2..max) y target continuo
    cat_targets, cont_targets = [], []
    for col in df.columns:
        s = df[col].dropna()
        if s.empty:
            continue
        nunique = s.nunique()
        if 2 <= nunique <= p["classificationMaxClasses"]:
            cat_targets.append({"column": str(col), "classes": int(nunique)})
        if pd.api.types.is_numeric_dtype(s) and nunique > p["classificationMaxClasses"]:
            cont_targets.append(str(col))

    # balance del mejor candidato categorico (ratio clase minoritaria/mayoritaria)
    balance = None
    best_cat = None
    if cat_targets:
        best_cat = min(cat_targets, key=lambda c: c["classes"])
        vc = df[best_cat["column"]].value_counts()
        if len(vc) >= 2 and vc.max() > 0:
            balance = round(float(vc.min() / vc.max()), 3)

    # deteccion de columna temporal
    temporal_col = None
    for col in df.columns:
        s = df[col].dropna().astype(str).head(200)
        if s.empty:
            continue
        parsed = pd.to_datetime(s, errors="coerce", format="mixed")
        if parsed.notna().mean() > 0.8:
            temporal_col = str(col)
            break

    signals = {
        "rows": n_rows, "columns": n_cols, "numericFeatures": len(numeric_cols),
        "candidateClassificationTargets": cat_targets[:5],
        "candidateRegressionTargets": cont_targets[:5],
        "bestClassTarget": best_cat, "classBalanceRatio": balance,
        "temporalColumn": temporal_col,
    }

    # --- perfiles de aptitud (reglas interpretables) ---
    fitness = []

    # Clasificacion
    if not cat_targets:
        fitness.append(_fit("Clasificacion", "no_apto", "No hay columna categorica que sirva de target (clases 2..%d)." % p["classificationMaxClasses"]))
    elif n_rows < p["minRowsClassification"]:
        fitness.append(_fit("Clasificacion", "limitado", f"Hay target ('{best_cat['column']}') pero solo {n_rows} filas (< {p['minRowsClassification']})."))
    elif balance is not None and balance < p["imbalanceWarnRatio"]:
        fitness.append(_fit("Clasificacion", "limitado", f"Target '{best_cat['column']}' desbalanceado (ratio {balance}). Requiere balanceo."))
    else:
        fitness.append(_fit("Clasificacion", "apto", f"Target '{best_cat['column']}' con {best_cat['classes']} clases y {n_rows} filas."))

    # Regresion
    if not cont_targets:
        fitness.append(_fit("Regresion", "no_apto", "No hay variable numerica continua que sirva de target."))
    elif n_rows < p["minRowsRegression"]:
        fitness.append(_fit("Regresion", "limitado", f"Hay target continuo pero solo {n_rows} filas."))
    else:
        fitness.append(_fit("Regresion", "apto", f"Variable continua disponible ('{cont_targets[0]}') y {n_rows} filas."))

    # Clustering (no necesita target)
    if len(numeric_cols) < p["minFeatures"]:
        fitness.append(_fit("Clustering", "no_apto", f"Solo {len(numeric_cols)} features numericas (< {p['minFeatures']})."))
    elif n_rows < p["minRowsClustering"]:
        fitness.append(_fit("Clustering", "limitado", f"Pocas filas ({n_rows})."))
    else:
        fitness.append(_fit("Clustering", "apto", f"{len(numeric_cols)} features numericas y {n_rows} filas."))

    # Series temporales
    if temporal_col is None:
        fitness.append(_fit("Series temporales", "no_apto", "No se detecto columna temporal (fecha/hora)."))
    else:
        fitness.append(_fit("Series temporales", "apto", f"Columna temporal detectada: '{temporal_col}'."))

    apt = sum(1 for f in fitness if f["fit"] == "apto")
    readiness_score = int(round(100 * apt / len(fitness)))

    return {"readinessScore": readiness_score, "signals": signals, "fitness": fitness}


def _fit(use_case, fit, reason):
    return {"useCase": use_case, "fit": fit, "reason": reason}


# ----------------------- Ensamblado -----------------------

def build_report(df, rows_total, rows_sampled, config):
    metrics = raw_metrics(df)
    dimensions, quality_score = compute_dimensions(metrics, config)
    issues = build_issues(dimensions, metrics, config)
    ml = assess_ml_readiness(df, config)

    alerts = []
    if rows_total and rows_sampled and rows_total > rows_sampled:
        alerts.append(f"Analisis sobre sample de {rows_sampled} filas de {rows_total} totales.")
    empty_cols = [c["column"] for c in metrics["columnCompleteness"] if c["completenessPct"] == 0]
    for col in empty_cols:
        alerts.append(f"La columna '{col}' esta completamente vacia.")
    if quality_score < 50:
        alerts.append("Calidad baja: revisar el dataset antes de usarlo en investigacion.")

    return {
        "methodology": {
            "version": config["methodologyVersion"],
            "framework": config["framework"],
        },
        "qualityScore": quality_score,
        "dimensions": dimensions,
        "sample": {"rowsTotal": rows_total, "rowsSampled": rows_sampled, "columns": df.shape[1]},
        "metrics": {
            "missingValuesPct": metrics["missingValuesPct"],
            "duplicateRowsPct": metrics["duplicateRowsPct"],
            "outliersPct": metrics["outliersPct"],
            "typeConsistencyPct": metrics["typeConsistencyPct"],
            "columnCompleteness": metrics["columnCompleteness"],
        },
        "issues": issues,
        "alerts": alerts,
        "mlReadiness": ml,
    }


def main():
    parser = argparse.ArgumentParser(description="QualityAI - analisis de calidad de datasets")
    parser.add_argument("path", help="Ruta al archivo (.csv o .xlsx)")
    parser.add_argument("--max-rows", type=int, default=DEFAULT_MAX_ROWS)
    args = parser.parse_args()

    try:
        config = load_config()
        log(f"Cargando {args.path} (max_rows={args.max_rows})")
        df, rows_total, rows_sampled = load_sample(args.path, args.max_rows)
        if df.shape[1] == 0 or len(df) == 0:
            raise ValueError("El archivo no tiene datos analizables.")
        report = build_report(df, rows_total, rows_sampled, config)
        # Reproducibilidad: con esto se puede re-correr y verificar el resultado.
        report["reproducibility"] = {
            "sampleSha256": sha256_of_file(args.path),
            "fileBytes": os.path.getsize(args.path),
            "rowsAnalyzed": rows_sampled,
            "rowsTotal": rows_total,
            "maxRows": args.max_rows,
            "configVersion": config["methodologyVersion"],
            "engineVersion": "quality.py/2.0",
            "analyzedAt": datetime.now(timezone.utc).isoformat(),
        }
        print(json.dumps(report, ensure_ascii=False))
    except Exception as exc:
        log(f"ERROR: {exc}")
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()

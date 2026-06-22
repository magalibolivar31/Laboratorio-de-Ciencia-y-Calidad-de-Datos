#!/usr/bin/env python3
"""
experiment_correlation.py - Valida la HIPÓTESIS central del paper.

    H1: un Quality Score (inspirado en ISO/IEC 25012) predice la utilidad real
        de un dataset para tareas de Machine Learning.

Para cada dataset del corpus (experiment_corpus.json):
  1) descarga un sample,
  2) calcula las 4 dimensiones de calidad + el Quality Score (reusa quality.py),
  3) entrena un modelo baseline y mide su performance real (F1 / R²),
luego sobre todo el corpus:
  4) correlaciona cada dimensión y el score con la performance (Pearson + Spearman),
  5) APRENDE los pesos óptimos de los datos (NNLS) -> responde "¿por qué esos pesos?",
  6) compara: pesos actuales vs pesos iguales vs pesos aprendidos.

Salida: JSON por STDOUT + un reporte legible en python/experiment_results.md.

Uso:
    python experiment_correlation.py [--corpus experiment_corpus.json] [--max-rows 20000]
"""

import argparse
import json
import os
import sys
import tempfile
import warnings

import numpy as np
import pandas as pd
import requests

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # para importar quality.py
from quality import load_config, load_sample, raw_metrics, compute_dimensions  # noqa: E402

DIM_IDS = ["completeness", "consistency", "accuracy", "uniqueness"]


def log(msg):
    print(f"[experiment] {msg}", file=sys.stderr)


def download(url, max_mb=25):
    """Descarga directa a un archivo temporal. Devuelve la ruta local."""
    ext = ".xlsx" if url.lower().split("?")[0].endswith((".xlsx", ".xls")) else ".csv"
    fd, path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    max_bytes = int(max_mb * 1024 * 1024)
    downloaded = 0
    with requests.get(url, stream=True, timeout=30, headers={"User-Agent": "QualityAI-Exp/1.0"}) as r:
        r.raise_for_status()
        with open(path, "wb") as fh:
            for chunk in r.iter_content(64 * 1024):
                fh.write(chunk)
                downloaded += len(chunk)
                if downloaded >= max_bytes:
                    break
    return path


def baseline_performance(df, target, max_rows):
    """Entrena un baseline y devuelve (performance, metric, task)."""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.model_selection import cross_val_score
    from sklearn.preprocessing import LabelEncoder

    if target not in df.columns:
        raise ValueError(f"target '{target}' no está en el dataset")
    if len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=42).reset_index(drop=True)
    df = df.dropna(subset=[target])
    y = df[target]
    X = df.drop(columns=[target])

    X_enc = pd.DataFrame(index=X.index)
    for col in X.columns:
        s = X[col]
        if pd.api.types.is_numeric_dtype(s):
            X_enc[col] = s.fillna(s.median())
        elif s.nunique() <= 50:
            X_enc[col] = LabelEncoder().fit_transform(s.astype(str).fillna("NA"))
    # red de seguridad: si quedó algún NaN (p.ej. columna entera vacía tras degradar)
    X_enc = X_enc.dropna(axis=1, how="all").fillna(0)
    if X_enc.shape[1] == 0 or len(df) < 30:
        raise ValueError("insuficientes features/filas para entrenar")

    is_clf = (not pd.api.types.is_numeric_dtype(y)) or (y.nunique() <= 20)
    if is_clf:
        y_enc = LabelEncoder().fit_transform(y.astype(str))
        model = RandomForestClassifier(n_estimators=120, random_state=42, n_jobs=-1)
        scoring, task = "f1_weighted", "clasificacion"
    else:
        y_enc = pd.to_numeric(y, errors="coerce")
        ok = y_enc.notna()
        X_enc, y_enc = X_enc[ok], y_enc[ok]
        model = RandomForestRegressor(n_estimators=120, random_state=42, n_jobs=-1)
        scoring, task = "r2", "regresion"

    cv = min(5, max(2, len(X_enc) // 10))
    perf = float(np.mean(cross_val_score(model, X_enc, y_enc, cv=cv, scoring=scoring, n_jobs=-1)))
    return round(perf, 4), scoring, task


def estimate_label_quality(df, target, max_rows):
    """Estima la calidad de las ETIQUETAS sin ground truth, vía desacuerdo del modelo
    en validación cruzada (idea de confident learning / Cleanlab): si el modelo,
    entrenado en el resto, predice consistentemente algo distinto de la etiqueta dada,
    esa etiqueta es sospechosa. Devuelve 0-100 (100 = etiquetas coherentes).
    Solo aplica a clasificación."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_predict
    from sklearn.preprocessing import LabelEncoder

    if target not in df.columns:
        raise ValueError(f"target '{target}' no está")
    if len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=42).reset_index(drop=True)
    df = df.dropna(subset=[target])
    y = df[target]
    if pd.api.types.is_numeric_dtype(y) and y.nunique() > 20:
        return None  # regresión: este proxy no aplica

    X = df.drop(columns=[target])
    X_enc = pd.DataFrame(index=X.index)
    for col in X.columns:
        s = X[col]
        if pd.api.types.is_numeric_dtype(s):
            X_enc[col] = s.fillna(s.median())
        elif s.nunique() <= 50:
            X_enc[col] = LabelEncoder().fit_transform(s.astype(str).fillna("NA"))
    X_enc = X_enc.dropna(axis=1, how="all").fillna(0)
    if X_enc.shape[1] == 0 or len(df) < 30:
        return None

    y_enc = LabelEncoder().fit_transform(y.astype(str))
    cv = min(5, max(2, len(X_enc) // 10))
    model = RandomForestClassifier(n_estimators=120, random_state=42, n_jobs=-1)
    preds = cross_val_predict(model, X_enc, y_enc, cv=cv, n_jobs=-1)
    disagreement = float(np.mean(preds != y_enc))
    return round(100 * (1 - disagreement), 2)


def correlate(x, y):
    """Pearson y Spearman entre dos listas. Robusto a poca varianza."""
    from scipy.stats import pearsonr, spearmanr
    x, y = np.array(x, float), np.array(y, float)
    out = {}
    try:
        r, p = pearsonr(x, y)
        out["pearson"] = None if np.isnan(r) else round(float(r), 3)
        out["pearson_p"] = None if np.isnan(p) else round(float(p), 4)
    except Exception:
        out["pearson"] = None
    try:
        r, p = spearmanr(x, y)
        out["spearman"] = None if np.isnan(r) else round(float(r), 3)
    except Exception:
        out["spearman"] = None
    return out


def learn_weights(dim_matrix, perf):
    """Aprende pesos NO negativos que mejor predicen la performance (NNLS),
    normalizados para sumar 1. Responde 'por qué esos pesos': salen de los datos."""
    from scipy.optimize import nnls
    A = np.array(dim_matrix, float)          # n x 4 (valores 0-100)
    b = np.array(perf, float)                # n  (0-1)
    coef, _ = nnls(A, b)
    if coef.sum() == 0:
        return None
    w = coef / coef.sum()
    return {DIM_IDS[i]: round(float(w[i]), 3) for i in range(len(DIM_IDS))}


def score_with_weights(dim_values, weights):
    return sum(dim_values[d] * weights[d] for d in DIM_IDS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=os.path.join(HERE, "experiment_corpus.json"))
    ap.add_argument("--max-rows", type=int, default=20000)
    args = ap.parse_args()

    config = load_config()
    current_weights = {d: config["dimensions"][d]["weight"] for d in DIM_IDS}

    with open(args.corpus, "r", encoding="utf-8") as fh:
        corpus = json.load(fh)["datasets"]

    rows = []
    for ds in corpus:
        try:
            log(f"Procesando {ds['name']} …")
            path = download(ds["url"], args.max_rows and 25)
            df, _, rows_sampled = load_sample(path, args.max_rows)
            metrics = raw_metrics(df)
            dims, score = compute_dimensions(metrics, config)
            dim_values = {d["id"]: d["value"] for d in dims}
            perf, metric, task = baseline_performance(df, ds["target"], args.max_rows)
            rows.append({
                "name": ds["name"], "source": ds.get("source", "?"), "target": ds["target"],
                "task": task, "metric": metric, "performance": perf,
                "qualityScore": score, **{f"dim_{d}": dim_values[d] for d in DIM_IDS},
            })
            try:
                os.remove(path)
            except OSError:
                pass
        except Exception as exc:
            log(f"  ⚠ {ds['name']} omitido: {exc}")

    result = {"n": len(rows), "datasets": rows, "currentWeights": current_weights}

    if len(rows) >= 3:
        perf = [r["performance"] for r in rows]
        # correlación de cada dimensión y del score con la performance
        result["correlations"] = {
            "qualityScore": correlate([r["qualityScore"] for r in rows], perf),
            **{d: correlate([r[f"dim_{d}"] for r in rows], perf) for d in DIM_IDS},
        }
        # pesos aprendidos de los datos
        dim_matrix = [[r[f"dim_{d}"] for d in DIM_IDS] for r in rows]
        learned = learn_weights(dim_matrix, perf)
        result["learnedWeights"] = learned

        # comparación: score con pesos actuales vs iguales vs aprendidos
        equal_w = {d: 0.25 for d in DIM_IDS}
        comp = {}
        for label, w in [("actuales", current_weights), ("iguales", equal_w), ("aprendidos", learned)]:
            if not w:
                continue
            s = [score_with_weights({d: r[f"dim_{d}"] for d in DIM_IDS}, w) for r in rows]
            comp[label] = {"weights": w, "corrVsPerformance": correlate(s, perf)}
        result["weightComparison"] = comp
    else:
        result["note"] = "Se necesitan al menos 3 datasets analizados para correlacionar."

    print(json.dumps(result, ensure_ascii=False))
    write_report(result)


def write_report(result):
    """Reporte legible en Markdown, listo para pegar en el paper."""
    p = os.path.join(HERE, "experiment_results.md")
    L = []
    L.append("# Experimento — Validación de H1 (Quality Score ↔ utilidad ML)\n")
    L.append(f"**Datasets analizados:** {result['n']}\n")

    L.append("## Resultados por dataset\n")
    L.append("| Dataset | Fuente | Tarea | Performance | Quality Score |")
    L.append("|---|---|---|---|---|")
    for r in result["datasets"]:
        L.append(f"| {r['name']} | {r['source']} | {r['task']} | {r['performance']} ({r['metric']}) | {r['qualityScore']} |")

    if "correlations" in result:
        L.append("\n## Correlación con la performance real (H1)\n")
        L.append("| Variable | Pearson | Spearman |")
        L.append("|---|---|---|")
        c = result["correlations"]
        L.append(f"| **Quality Score** | {c['qualityScore'].get('pearson')} | {c['qualityScore'].get('spearman')} |")
        for d in DIM_IDS:
            L.append(f"| {d} | {c[d].get('pearson')} | {c[d].get('spearman')} |")

        L.append("\n## Pesos: actuales vs iguales vs aprendidos de los datos\n")
        L.append("| Esquema | completeness | consistency | accuracy | uniqueness | Corr. score↔perf (Pearson) |")
        L.append("|---|---|---|---|---|---|")
        for label, info in result.get("weightComparison", {}).items():
            w = info["weights"]
            corr = info["corrVsPerformance"].get("pearson")
            L.append(f"| {label} | {w['completeness']} | {w['consistency']} | {w['accuracy']} | {w['uniqueness']} | {corr} |")

        L.append("\n> **Interpretación**: si los *pesos aprendidos* logran mayor correlación que los actuales,")
        L.append("> la pregunta \"¿por qué esos pesos?\" se responde con datos: **no se eligieron, se derivaron**.")

    with open(p, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    log(f"Reporte escrito en {p}")


if __name__ == "__main__":
    main()

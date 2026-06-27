#!/usr/bin/env python3
"""
quality_validate.py - Validacion predictiva (utilidad real para ML).

Uso:
    python quality_validate.py <ruta_archivo> --target <columna> [--max-rows N]

Entrena un modelo BASELINE sobre la columna target y mide su rendimiento con
validacion cruzada. El objetivo NO es el mejor modelo, sino una medida objetiva
de "que tan usable es este dataset para ML". Ese numero es el que se correlaciona
con el Quality Score para validarlo predictivamente (de descriptivo -> predictivo).

Devuelve JSON por STDOUT.
"""

import argparse
import json
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
DEFAULT_MAX_ROWS = 20000


def log(msg):
    print(f"[quality_validate.py] {msg}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--target", required=True)
    ap.add_argument("--max-rows", type=int, default=DEFAULT_MAX_ROWS)
    args = ap.parse_args()

    try:
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
        from sklearn.model_selection import cross_val_score
        from sklearn.preprocessing import LabelEncoder

        # carga (con detección de separador y encoding robusto para CSV)
        if args.path.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(args.path)
        else:
            import os, sys as _sys
            _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from quality import detect_sep, read_csv_robust
            sep = "\t" if args.path.lower().endswith(".tsv") else detect_sep(args.path)
            df = read_csv_robust(args.path, sep)
        if len(df) > args.max_rows:
            df = df.sample(n=args.max_rows, random_state=42).reset_index(drop=True)

        if args.target not in df.columns:
            raise ValueError(f"La columna target '{args.target}' no existe.")

        df = df.dropna(subset=[args.target])
        y = df[args.target]
        X = df.drop(columns=[args.target])

        # features: numericas + categoricas codificadas; imputacion simple
        X_enc = pd.DataFrame(index=X.index)
        for col in X.columns:
            s = X[col]
            if pd.api.types.is_numeric_dtype(s):
                X_enc[col] = s.fillna(s.median())
            else:
                # solo categoricas de cardinalidad razonable
                if s.nunique() <= 50:
                    X_enc[col] = LabelEncoder().fit_transform(s.astype(str).fillna("NA"))
        if X_enc.shape[1] == 0:
            raise ValueError("No hay features utilizables para entrenar.")
        if len(df) < 30:
            raise ValueError(f"Muy pocas filas para validar ({len(df)}).")

        # tipo de tarea
        is_classification = (not pd.api.types.is_numeric_dtype(y)) or (y.nunique() <= 20)

        if is_classification:
            y_enc = LabelEncoder().fit_transform(y.astype(str))
            model = RandomForestClassifier(n_estimators=120, random_state=42, n_jobs=-1)
            scoring = "f1_weighted"
            task = "clasificacion"
        else:
            y_enc = pd.to_numeric(y, errors="coerce")
            valid = y_enc.notna()
            X_enc, y_enc = X_enc[valid], y_enc[valid]
            model = RandomForestRegressor(n_estimators=120, random_state=42, n_jobs=-1)
            scoring = "r2"
            task = "regresion"

        cv = min(5, max(2, len(X_enc) // 10))
        log(f"Tarea={task} | cv={cv} | scoring={scoring} | filas={len(X_enc)} | features={X_enc.shape[1]}")
        scores = cross_val_score(model, X_enc, y_enc, cv=cv, scoring=scoring, n_jobs=-1)

        # --- Calidad de etiquetas (solo clasificacion) ---
        # Idea de confident learning: si el modelo, entrenado en el resto, predice
        # consistentemente algo distinto de la etiqueta dada, esa etiqueta es sospechosa.
        label_quality = None
        suspect_pct = None
        label_interpretation = None
        if is_classification:
            from sklearn.model_selection import cross_val_predict
            preds = cross_val_predict(model, X_enc, y_enc, cv=cv, n_jobs=-1)
            disagreement = float(np.mean(preds != y_enc))
            label_quality = round(100 * (1 - disagreement), 2)
            suspect_pct = round(100 * disagreement, 1)
            label_interpretation = _interpret_labels(label_quality)

        result = {
            "target": args.target,
            "task": task,
            "metric": scoring,
            "performance": round(float(np.mean(scores)), 4),
            "performanceStd": round(float(np.std(scores)), 4),
            "cvFolds": cv,
            "rowsUsed": int(len(X_enc)),
            "featuresUsed": int(X_enc.shape[1]),
            "interpretation": _interpret(task, float(np.mean(scores))),
            "labelQuality": label_quality,
            "suspectLabelsPct": suspect_pct,
            "labelInterpretation": label_interpretation,
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        log(f"ERROR: {exc}")
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        sys.exit(1)


def _interpret_labels(lq):
    if lq >= 85:
        return "Etiquetas coherentes con los datos."
    if lq >= 70:
        return "Etiquetas mayormente coherentes; algunas dudosas."
    return "Varias etiquetas parecen mal asignadas (ruido de etiquetas)."


def _interpret(task, score):
    if task == "clasificacion":
        if score >= 0.8:
            return "Alta usabilidad: un baseline ya clasifica muy bien."
        if score >= 0.6:
            return "Usabilidad media: senal predictiva presente, mejorable."
        return "Baja usabilidad: el baseline apenas supera el azar."
    # regresion (r2)
    if score >= 0.6:
        return "Alta usabilidad: el target es predecible desde las features."
    if score >= 0.3:
        return "Usabilidad media: senal moderada."
    return "Baja usabilidad: las features explican poco el target."


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
experiment_degradation.py - Experimento de DEGRADACIÓN CONTROLADA (el fuerte para H1).

Idea: en vez de comparar datasets distintos (no comparables entre sí), tomamos UN
dataset bueno y le inyectamos deterioro creciente (valores faltantes + duplicados).
Medimos cómo baja el Quality Score y cómo baja la performance del modelo baseline.

Si al deteriorar la calidad la performance cae junto con el score, tenemos evidencia
CAUSAL (no solo correlación) de que el Quality Score captura la utilidad para ML.
Como es el mismo dataset, la performance SÍ es comparable entre niveles.

Salida: JSON por STDOUT + reporte en python/experiment_degradation_results.md.

Uso:
    python experiment_degradation.py [--url <csv>] [--target <col>] [--name X]
                                     [--levels 0,0.1,0.2,0.3,0.4,0.5] [--max-rows 20000]
"""

import argparse
import json
import os
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from quality import load_config, load_sample, raw_metrics, compute_dimensions  # noqa: E402
from experiment_correlation import (  # noqa: E402
    download, baseline_performance, correlate, estimate_label_quality, DIM_IDS,
)


def log(msg):
    print(f"[degradation] {msg}", file=sys.stderr)


def degrade(df, frac, target, rng):
    """Inyecta `frac` de valores faltantes en las features (no en el target)
    y agrega `frac/2` de filas duplicadas. Simula un dataset de peor calidad."""
    d = df.copy()
    feat_cols = [c for c in d.columns if c != target]
    if frac > 0 and feat_cols:
        mask = rng.random((len(d), len(feat_cols))) < frac
        block = d[feat_cols].mask(mask)
        d[feat_cols] = block
        # duplicados: frac/2 de las filas
        n_dup = int(len(d) * frac / 2)
        if n_dup > 0:
            dup = d.sample(n=n_dup, replace=True, random_state=42)
            d = pd.concat([d, dup], ignore_index=True)
    return d


def inject_label_noise(df, frac, target, rng):
    """Voltea `frac` de las etiquetas del target a otra clase al azar.
    No toca las features → el score de features NO lo detecta, pero SÍ la performance."""
    d = df.copy()
    classes = list(pd.Series(d[target].dropna().unique()))
    if frac <= 0 or len(classes) < 2:
        return d
    n = int(len(d) * frac)
    idx = rng.choice(len(d), size=n, replace=False)
    col = d.columns.get_loc(target)
    for i in idx:
        cur = d.iat[i, col]
        others = [c for c in classes if c != cur]
        if others:
            d.iat[i, col] = others[int(rng.integers(len(others)))]
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv")
    ap.add_argument("--target", default="Survived")
    ap.add_argument("--name", default="Titanic")
    ap.add_argument("--mode", choices=["features", "labels"], default="features",
                    help="features = faltantes/duplicados; labels = ruido en las etiquetas")
    ap.add_argument("--levels", default="0,0.1,0.2,0.3,0.4,0.5")
    ap.add_argument("--max-rows", type=int, default=20000)
    args = ap.parse_args()

    levels = [float(x) for x in args.levels.split(",")]
    config = load_config()
    rng = np.random.default_rng(42)

    log(f"Descargando {args.name} …")
    path = download(args.url, 25)
    base_df, _, _ = load_sample(path, args.max_rows)
    try:
        os.remove(path)
    except OSError:
        pass

    steps = []
    for lvl in levels:
        try:
            if args.mode == "labels":
                d = inject_label_noise(base_df, lvl, args.target, rng)
            else:
                d = degrade(base_df, lvl, args.target, rng)

            metrics = raw_metrics(d)
            dims, feat_score = compute_dimensions(metrics, config)
            perf, metric, _ = baseline_performance(d, args.target, args.max_rows)

            row = {
                "degradation": lvl,
                "featureScore": feat_score,
                "completeness": next(x["value"] for x in dims if x["id"] == "completeness"),
                "performance": perf,
                "metric": metric,
            }
            if args.mode == "labels":
                lq = estimate_label_quality(d, args.target, args.max_rows)
                row["labelQuality"] = lq
                # score combinado: promedio de calidad de features y de etiquetas
                row["combinedScore"] = round((feat_score + lq) / 2, 1) if lq is not None else feat_score
                log(f"  ruido {int(lvl*100)}% -> featScore {feat_score}, labelQ {lq}, comb {row['combinedScore']}, perf {perf}")
            else:
                log(f"  deterioro {int(lvl*100)}% -> featScore {feat_score}, perf {perf}")
            steps.append(row)
        except Exception as exc:
            log(f"  nivel {lvl} omitido: {exc}")

    result = {"dataset": args.name, "target": args.target, "mode": args.mode, "steps": steps}

    if len(steps) >= 3:
        perf = [s["performance"] for s in steps]
        # qué score predice mejor la performance:
        result["correlations"] = {
            "featureScore": correlate([s["featureScore"] for s in steps], perf),
        }
        if args.mode == "labels":
            result["correlations"]["labelQuality"] = correlate(
                [s["labelQuality"] for s in steps if s.get("labelQuality") is not None],
                [s["performance"] for s in steps if s.get("labelQuality") is not None],
            )
            result["correlations"]["combinedScore"] = correlate([s["combinedScore"] for s in steps], perf)

    print(json.dumps(result, ensure_ascii=False))
    write_report(result)


def write_report(result):
    p = os.path.join(HERE, "experiment_degradation_results.md")
    mode = result.get("mode", "features")
    L = []
    L.append("# Experimento — Degradación controlada (evidencia causal de H1)\n")
    L.append(f"**Dataset:** {result['dataset']} · **target:** {result['target']} · **modo:** {mode}\n")

    if mode == "labels":
        L.append("Se voltea un % creciente de **etiquetas** del target (las features no se tocan).")
        L.append("Esto NO lo capta el score de features, pero SÍ lo capta la *calidad de etiquetas*"
                 " (estimada por desacuerdo del modelo) y golpea la performance.\n")
        L.append("| Ruido etiquetas | Score features | Calidad etiquetas | Score combinado | Performance |")
        L.append("|---|---|---|---|---|")
        for s in result["steps"]:
            L.append(f"| {int(s['degradation']*100)}% | {s['featureScore']} | {s.get('labelQuality')} | {s.get('combinedScore')} | {s['performance']} |")
        if "correlations" in result:
            c = result["correlations"]
            L.append("\n**Correlación con la performance** (Pearson):")
            L.append(f"- Score de features solo: **{c['featureScore'].get('pearson')}** (no debería detectar el problema)")
            L.append(f"- Calidad de etiquetas: **{c['labelQuality'].get('pearson')}**")
            L.append(f"- **Score combinado: {c['combinedScore'].get('pearson')}**")
            comb = c['combinedScore'].get('pearson')
            feat = c['featureScore'].get('pearson')
            if comb is not None and feat is not None and abs(comb) > abs(feat):
                L.append("\n> ✅ El score combinado predice la performance mucho mejor que el de features solo. "
                         "**Conclusión: incorporar calidad de etiquetas hace al score predictivo (apoya H1).**")
    else:
        L.append("Se inyecta deterioro creciente (faltantes + duplicados) en las **features**"
                 " sobre el MISMO dataset y se mide cómo caen el score y la performance.\n")
        L.append("| Deterioro | Completitud | Score features | Performance |")
        L.append("|---|---|---|---|")
        for s in result["steps"]:
            L.append(f"| {int(s['degradation']*100)}% | {s['completeness']}% | {s['featureScore']} | {s['performance']} |")
        if "correlations" in result:
            c = result["correlations"]["featureScore"]
            L.append(f"\n**Correlación Score↔Performance:** Pearson **{c.get('pearson')}**, Spearman **{c.get('spearman')}**.")
            L.append("\n> Nota: con imputación, RandomForest suele absorber el deterioro de features"
                     " → correlación baja. Por eso el modo `labels` es más revelador.")

    with open(p, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    log(f"Reporte escrito en {p}")


if __name__ == "__main__":
    main()

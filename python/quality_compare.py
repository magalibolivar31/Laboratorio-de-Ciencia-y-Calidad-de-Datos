#!/usr/bin/env python3
"""
quality_compare.py - Comparacion estadistica de calidad entre fuentes.

Lee por STDIN un JSON: { "Kaggle": [78, 65, ...], "UCI": [90, 88, ...], ... }
(scores de calidad agrupados por fuente) y devuelve por STDOUT:
  - estadisticos descriptivos por fuente (n, media, mediana, desvio, min, max)
  - test de Kruskal-Wallis (no parametrico) para diferencia entre fuentes
  - ranking de fuentes por mediana

Permite responder empiricamente: que repositorio publica datasets de mayor calidad.
"""

import json
import math
import sys
import warnings

import numpy as np

warnings.filterwarnings("ignore")


def main():
    try:
        data = json.loads(sys.stdin.read() or "{}")
        groups = {k: [float(x) for x in v] for k, v in data.items() if v}

        per_source = []
        for src, scores in groups.items():
            arr = np.array(scores, dtype=float)
            per_source.append({
                "source": src,
                "n": int(arr.size),
                "mean": round(float(arr.mean()), 2),
                "median": round(float(np.median(arr)), 2),
                "std": round(float(arr.std(ddof=1)), 2) if arr.size > 1 else 0.0,
                "min": round(float(arr.min()), 2),
                "max": round(float(arr.max()), 2),
            })
        per_source.sort(key=lambda x: x["median"], reverse=True)

        # Kruskal-Wallis: requiere >=2 grupos con >=2 observaciones cada uno
        test = {"applicable": False, "reason": "Se necesitan al menos 2 fuentes con 2+ analisis cada una."}
        valid = [v for v in groups.values() if len(v) >= 2]
        if len(valid) >= 2:
            try:
                from scipy.stats import kruskal
                stat, pvalue = kruskal(*valid)
                if math.isnan(stat) or math.isnan(pvalue):
                    # Ocurre cuando no hay varianza (todos los scores iguales): el test no aplica.
                    raise ValueError("sin varianza en los datos")
                test = {
                    "applicable": True,
                    "test": "Kruskal-Wallis H",
                    "statistic": round(float(stat), 4),
                    "pValue": round(float(pvalue), 5),
                    "significant": bool(pvalue < 0.05),
                    "interpretation": (
                        "Diferencia significativa de calidad entre fuentes (p < 0.05)."
                        if pvalue < 0.05 else
                        "No hay evidencia de diferencia significativa entre fuentes (p >= 0.05)."
                    ),
                }
            except ImportError:
                test = {"applicable": False, "reason": "scipy no esta instalado."}
            except ValueError as ve:
                test = {"applicable": False, "reason": f"Test no aplicable: {ve}. Se requieren scores con variabilidad."}

        print(json.dumps({"perSource": per_source, "test": test}, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()

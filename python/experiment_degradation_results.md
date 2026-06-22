# Experimento — Degradación controlada (evidencia causal de H1)

**Dataset:** Titanic · **target:** Survived · **modo:** labels

Se voltea un % creciente de **etiquetas** del target (las features no se tocan).
Esto NO lo capta el score de features, pero SÍ lo capta la *calidad de etiquetas* (estimada por desacuerdo del modelo) y golpea la performance.

| Ruido etiquetas | Score features | Calidad etiquetas | Score combinado | Performance |
|---|---|---|---|---|
| 0% | 89 | 80.58 | 84.8 | 0.7959 |
| 10% | 89 | 70.26 | 79.6 | 0.6757 |
| 20% | 89 | 65.43 | 77.2 | 0.6407 |
| 30% | 90 | 57.46 | 73.7 | 0.5644 |
| 40% | 90 | 49.83 | 69.9 | 0.4237 |
| 50% | 90 | 47.92 | 69.0 | 0.4119 |

**Correlación con la performance** (Pearson):
- Score de features solo: **-0.868** (no debería detectar el problema)
- Calidad de etiquetas: **0.992**
- **Score combinado: 0.992**

> ✅ El score combinado predice la performance mucho mejor que el de features solo. **Conclusión: incorporar calidad de etiquetas hace al score predictivo (apoya H1).**

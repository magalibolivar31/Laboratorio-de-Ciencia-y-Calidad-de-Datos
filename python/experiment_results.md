# Experimento — Validación de H1 (Quality Score ↔ utilidad ML)

**Datasets analizados:** 6

## Resultados por dataset

| Dataset | Fuente | Tarea | Performance | Quality Score |
|---|---|---|---|---|
| Titanic | GitHub | clasificacion | 0.7959 (f1_weighted) | 89 |
| Iris | seaborn | clasificacion | 0.9665 (f1_weighted) | 94 |
| Penguins | seaborn | clasificacion | 0.9884 (f1_weighted) | 95 |
| Tips | seaborn | clasificacion | 0.544 (f1_weighted) | 95 |
| MPG | seaborn | clasificacion | 0.7521 (f1_weighted) | 95 |
| Diamonds | seaborn | clasificacion | 0.4522 (f1_weighted) | 95 |

## Correlación con la performance real (H1)

| Variable | Pearson | Spearman |
|---|---|---|
| **Quality Score** | -0.189 | -0.372 |
| completeness | -0.159 | -0.516 |
| consistency | -0.104 | -0.131 |
| accuracy | -0.344 | -0.086 |
| uniqueness | -0.092 | 0.213 |

## Pesos: actuales vs iguales vs aprendidos de los datos

| Esquema | completeness | consistency | accuracy | uniqueness | Corr. score↔perf (Pearson) |
|---|---|---|---|---|---|
| actuales | 0.3 | 0.25 | 0.25 | 0.2 | -0.265 |
| iguales | 0.25 | 0.25 | 0.25 | 0.25 | -0.272 |
| aprendidos | 0.0 | 0.0 | 0.0 | 1.0 | -0.092 |

> **Interpretación**: si los *pesos aprendidos* logran mayor correlación que los actuales,
> la pregunta "¿por qué esos pesos?" se responde con datos: **no se eligieron, se derivaron**.

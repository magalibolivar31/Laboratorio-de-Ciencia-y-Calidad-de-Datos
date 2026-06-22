# 🧪 README MAGA — Sección "Calidad de Datos" (QualityAI)

> Guía rápida y en criollo de todo lo que hace la página **Calidad de Datos**.
> Hecho para Maga 💜

---

## ✨ En una frase

Buscás o pegás un dataset → el sistema lo evalúa con un score **inspirado en las dimensiones
de ISO/IEC 25012**, te dice **para qué sirve en Machine Learning**, detecta sus problemas,
te explica cada métrica, y **compara la calidad observada entre las fuentes** de donde vienen
los datasets.

> Nombre técnico honesto: *"Sistema de evaluación de calidad basado en muestras recuperadas
> de datasets federados"*. No es un "checker" que mira el dataset entero — mira una **muestra**.

---

## 0. ⚖️ Encuadre honesto (leer antes que nada)

Para que esto sea defendible (y no te lo cuestionen), tres aclaraciones clave:

1. **Trabaja sobre 3 objetos distintos** — no confundirlos:
   - **Metadata** = la descripción del dataset (nombre, tags, licencia) que viene de la fuente.
   - **Sample** = la muestra de datos que el sistema descarga y **realmente analiza**.
   - **Report** = el resultado (`QualityReport`) guardado en la base.
2. **El score mide una MUESTRA, no el dataset completo.** Se baja un sample (25 MB / 100k filas).
   Eso es una técnica válida, pero el resultado depende de la muestra → **se declara explícito**.
   Hoy soporta datasets **tabulares** (`.csv`, `.xlsx`, `.tsv`) y **detecta solo el separador**
   del CSV (coma, `;`, tab o `|`) — clave para los CSV de gobierno/español que usan `;`.
   Los no tabulares (JSON anidado, parquet) quedan fuera.
3. **No es "ISO 25012 compliant".** ISO 25012 define *las dimensiones* de calidad, pero **no**
   cómo ponderarlas ni cómo agregarlas en un score único. Eso es una **heurística propia
   inspirada en ISO**. El marco es ISO; la fórmula y los pesos son nuestros (y versionados).

---

## 1. 🟥 Banner de explicación (arriba de todo)

Un cartel rojo que explica para qué sirve la sección y te invita a tocar los **(?)**
para entender cada métrica.

## 2. 📥 Cómo analizar un dataset real

Hay dos maneras de meter un dataset real (los datos de adentro, no la planilla de metadatos):
- **Subir un archivo** de tu compu (`.csv`, `.xlsx` o `.tsv`, hasta 50 MB) — arrastrándolo o con clic.
- **Por URL**: pegás un enlace de **descarga directa** que termine en `.csv` o `.xlsx`.
  ⚠️ La *página* del dataset (ej. `…/dataset/consultas-medicas…`) **no sirve**: hay que copiar el
  enlace del archivo en sí. Si el sitio falla (SSL, etc.), el sistema te avisa y te sugiere subir el archivo.

Analiza los **datos internos reales** del dataset, y del lado de la URL **baja un sample** (corta por
25 MB / 100k filas). Al terminar, un **cartel verde** ("subido y analizado ✓") confirma que salió bien.
El CSV se tabula aunque use `;` (separador autodetectado).

> ⛔ **Nota:** antes existía una opción de "analizar una exportación de metadatos" (los Excel del
> buscador). **Se eliminó a propósito**: esos Excel son *listados de datasets* (metadatos), no datasets
> reales — medir su "calidad" confundía justo lo que el sistema busca separar (metadata ≠ datos).
> El endpoint `POST /api/quality/analyze` queda en el backend pero ya no se usa desde la UI.

## 3. 📊 El resultado del análisis

| Bloque | Qué muestra |
|---|---|
| **Quality Score (0–100)** | Número global de calidad, con color (verde / ámbar / rojo). |
| **Desglose por dimensión (inspirado en ISO/IEC 25012)** | Completitud, Consistencia, Exactitud y Unicidad. Cada una con su valor, su peso, cuánto aporta al score y su estado. Transparente: ves cómo se forma el número. |
| **Aptitud para ML** | Puntaje ML-readiness + 4 tarjetas (Clasificación, Regresión, Clustering, Series temporales) → **apto / limitado / no apto** con la razón. *(Heurístico, ver "lo que falta".)* |
| **Validación predictiva** | Elegís una columna target y entrena un **modelo baseline real** (Random Forest + validación cruzada) que mide qué tan predecible es (F1 o R²). Mide *utilidad real*, no solo calidad técnica. **Es el bloque más fuerte: contesta una hipótesis científica** (ver abajo). |
| **Problemas detectados** | Hallazgos concretos por columna (faltantes, duplicados, outliers, tipos mezclados) con severidad unificada. |
| **Alertas** | Avisos de contexto (columnas vacías, análisis sobre sample, calidad baja). |

## 4. ❓ Pop-ups explicativos (los "(?)")

Cada métrica tiene un **(?)** que abre un modal con: qué es, qué mide, cómo se calcula,
por qué importa y un ejemplo. Pensado para entender sin saber data science.

## 5. 📈 Comparación entre fuentes (OCULTA por ahora)

> 🚫 **Hoy NO se muestra en la interfaz.** Está apagada con el flag
> `SHOW_SOURCE_COMPARISON = false` en `frontend/src/pages/QualityAnalysis.tsx`.
> El backend (`/api/quality/compare`, `quality_compare.py`) y el código siguen intactos:
> para reactivarla, poner el flag en `true`.

La feature agrupa los análisis por **repositorio de origen** (Kaggle, UCI, Zenodo…), calcula
calidad media, mediana, desvío y rango por fuente, y corre un **test de Kruskal-Wallis**.

**Por qué está oculta:** hoy es solo *exploratoria*. La muestra está sesgada (solo datasets que
los usuarios eligieron analizar, no aleatoria) y el volumen es bajo, así que **no permite afirmar
que "X repositorio es mejor"**. Mostrar un resultado que no se puede defender resta credibilidad.
Se reactivará cuando haya un **corpus de calidad variada** y muestreo controlado (ver "lo que falta").

---

## 6. 🔁 Reproducibilidad

Cada análisis guarda con qué se hizo, para poder **re-correrlo y verificarlo**:
- **`sampleSha256`** → hash del contenido exacto que se analizó (si cambia el dato, cambia el hash).
- **parámetros de descarga** (`maxMb`, `maxRows`, `url`, fecha).
- **versión del scoring** (`configVersion`) y del motor (`engineVersion`).
- **fecha de análisis**.

Se ve en el pie del panel de resultados (`sha256 … · config v2.0 · …`).

## 7. 🕓 Historial de análisis

Lista de todos los análisis anteriores (score, fecha, filas, columnas), guardados en la base.
Es lo que alimenta la comparación y permite seguimiento en el tiempo.

---

## 🧩 Cómo está hecho por dentro (para devs)

### Backend (Node/Express) — `backend/src/controllers/quality.controller.ts`
| Endpoint | Qué hace |
|---|---|
| `POST /api/quality/analyze` | Analiza un archivo de `/exports` (metadatos). |
| `POST /api/quality/analyze-url` | Descarga un sample desde una URL y analiza datos reales. |
| `POST /api/quality/upload-analyze` | Recibe un archivo subido (multipart) y lo analiza. |
| `POST /api/quality/validate` | Entrena un baseline ML sobre un target y mide performance. |
| `GET  /api/quality/compare` | Compara calidad entre fuentes + test estadístico. |
| `GET  /api/quality/history` | Historial de análisis del usuario. |
| `GET  /api/quality/report/:id` | Un reporte puntual. |

### Motores Python (`python/`)
| Archivo | Rol |
|---|---|
| `quality.py` | Motor principal: score ISO 25012, dimensiones, problemas, ML-readiness. |
| `quality_config.json` | Pesos y umbrales **versionados** del score (no están hardcodeados). |
| `dataset_download.py` | Descarga un sample representativo de un dataset desde su URL. |
| `quality_validate.py` | Entrena un baseline (Random Forest) y mide performance real. |
| `quality_compare.py` | Estadística comparativa entre fuentes (Kruskal-Wallis). |
| `experiment_correlation.py` | **Experimento H1**: corre calidad + baseline sobre un corpus, correlaciona score↔performance, aprende pesos óptimos (NNLS) e incluye `estimate_label_quality` (calidad de etiquetas vía desacuerdo del modelo). |
| `experiment_corpus.json` | Corpus de datasets (URL + target + fuente) para el experimento. Extensible. |
| `experiment_degradation.py` | **Experimento causal**: degrada un dataset de a poco. Modo `features` (faltantes/duplicados) y modo `labels` (ruido de etiquetas → el que apoya H1). |

### Frontend (React) — `frontend/src/`
| Archivo | Rol |
|---|---|
| `pages/QualityAnalysis.tsx` | La página completa. |
| `components/InfoPopover.tsx` | El modal de los "(?)". |
| `lib/quality-explanations.ts` | Textos de todas las explicaciones. |

### Base de datos (Prisma)
Tabla **`QualityReport`** — guarda cada análisis (score, dimensiones, problemas, fuente, etc.).

---

## 🗺️ El pipeline de un vistazo

```
 ENTRADA (3 formas)                         MOTOR (Python)                      SALIDA
┌────────────────────┐
│ 1. Subir archivo   │── .csv/.xlsx ──┐
│    (de tu compu)   │                │
├────────────────────┤                │   ┌───────────────────────────┐
│ 2. URL (descarga   │── baja sample ─┤   │ dataset_download.py        │
│    directa .csv)   │   25MB/100k    └──▶│  · streaming + tope        │
├────────────────────┤                    │  · detecta formato         │
│ 3. Exportación     │── planilla ───────▶└────────────┬──────────────┘
│    (metadatos)     │   de búsqueda                   │ archivo local
└────────────────────┘                                 ▼
                                          ┌───────────────────────────────────┐
                                          │ quality.py  (sample ≤ 50k filas)   │
                                          │  · detecta separador (, ; \t |)    │
                                          │  · ESTADÍSTICA: faltantes, dups,   │
                                          │    completitud, consistencia        │
                                          │  · ML: Isolation Forest (outliers) │
                                          │  · HEURÍSTICA: pesos+umbrales →    │
                                          │    Quality Score (ISO 25012)        │
                                          │  · Aptitud ML (reglas fitness)     │
                                          │  · hash SHA-256 (reproducibilidad) │
                                          └───────────────┬───────────────────┘
                                                          │ JSON
        ┌─────────────────────────────────────────────────┼─────────────────────────┐
        ▼                                                   ▼                         ▼
┌────────────────────┐                        ┌──────────────────────────┐  ┌──────────────────┐
│ quality_validate.py│  (si elegís target)    │ PostgreSQL               │  │ FRONTEND React   │
│ · RF baseline      │                        │  tabla QualityReport     │  │  · Score + barras│
│   (performance F1/R²)│──────────────────────▶│  (score, dims, fuente,   │◀─│  · Aptitud ML    │
│ · Calidad etiquetas│                        │   reproducibilidad…)     │  │  · Problemas     │
│   (confident learn)│                        └────────────┬─────────────┘  │  · Validación    │
└────────────────────┘                                     │                │  · (?) popups     │
                                                            ▼                └──────────────────┘
                                          ┌──────────────────────────────┐
                                          │ quality_compare.py           │
                                          │  Kruskal-Wallis entre fuentes│
                                          └──────────────────────────────┘

  EXPERIMENTOS (offline, para el paper):
  experiment_correlation.py  → corpus → correlación score↔performance + pesos NNLS
  experiment_degradation.py  → degrada 1 dataset (features / etiquetas) → evidencia causal de H1
```

**Flujo en una línea:** entrada → (descarga/lee sample) → `quality.py` calcula score + dimensiones +
aptitud ML → se guarda en Postgres → el frontend lo muestra → opcional: `quality_validate.py` mide
utilidad real y calidad de etiquetas → `quality_compare.py` compara fuentes.

---

## 🔧 Detalle técnico completo: heurísticas, estadística y ML

Esta sección documenta **exactamente** qué técnica usa cada parte. Tres categorías:
**estadística** (descriptiva), **heurística** (reglas con umbrales fijos) y **ML** (modelos).

### A. El Quality Score — fórmula exacta

```
Quality Score = Σ ( peso_dimensión × valor_dimensión )     (escala 0–100)
```

| Dimensión | Valor (cómo sale) | Peso | Tipo | Característica ISO |
|---|---|---|---|---|
| **Completitud** | `100 − % celdas vacías` | **0.30** | Estadística | Completeness |
| **Consistencia** | `% del tipo de dato dominante por columna` (promedio) | **0.25** | Estadística + heurística | Consistency |
| **Exactitud** | `100 − % de outliers` | **0.25** | **ML** (Isolation Forest) | Accuracy |
| **Unicidad** | `100 − % de filas duplicadas` | **0.20** | Estadística | Uniqueness |

Los **pesos son heurísticos** y están versionados en `python/quality_config.json` (`methodologyVersion`).
No salen de ISO (ISO solo define las dimensiones). En los experimentos se prueban pesos alternativos
y se aprenden de los datos (ver sección de experimentos).

### B. Estadística (métodos descriptivos)

| Métrica | Cálculo exacto | Dónde |
|---|---|---|
| % faltantes | celdas nulas ÷ (filas × columnas) | `quality.py:raw_metrics` |
| % duplicados | `df.duplicated()` sobre filas exactas | `quality.py:raw_metrics` |
| Completitud por columna | % de no-nulos por columna | `quality.py:raw_metrics` |
| Consistencia de tipos | por columna: fracción del tipo dominante (numérico vs texto); se promedia | `quality.py:raw_metrics` |
| **Outliers — fallback** | **IQR**: fuera de `[Q1 − 1.5·IQR , Q3 + 1.5·IQR]` (si sklearn no está) | `quality.py:detect_outliers` |
| Comparación fuentes | media, mediana, desvío (ddof=1), min, max por fuente | `quality_compare.py` |
| **Test entre fuentes** | **Kruskal-Wallis H** (no paramétrico, no asume normalidad); p<0.05 = diferencia significativa | `quality_compare.py` |
| Correlaciones (experimentos) | **Pearson** y **Spearman** | `experiment_correlation.py:correlate` |
| Muestreo | aleatorio uniforme con semilla fija `42` (reproducible) | `quality.py:load_sample` |

### C. Heurísticas (reglas con umbrales fijos)

| Heurística | Regla exacta | Dónde |
|---|---|---|
| Pesos del score | 0.30 / 0.25 / 0.25 / 0.20 | `quality_config.json` |
| Umbrales de severidad | Completitud: warn<90, crit<70 · Consistencia: warn<95, crit<80 · Exactitud: warn<90, crit<75 · Unicidad: warn<98, crit<90 | `quality_config.json` |
| Severidad unificada | `valor < crit → critical · < warn → warning · resto → ok` (misma escala para todo) | `quality.py:rate` |
| Tipos mezclados | columna marcada si la minoría (numérico/texto) supera el **5%** | `quality.py:raw_metrics` |
| Separador CSV | cuenta `, ; \t \|` en el header y elige el de mayor frecuencia | `quality.py:detect_sep` |
| Sample (análisis) | tope **50.000 filas** | `quality.py` |
| Sample (descarga URL) | tope **25 MB / 100.000 filas**, lo que llegue primero | `dataset_download.py` |
| Score combinado | `(Quality Score + Calidad de etiquetas) ÷ 2` | front + experimentos |

#### Heurísticas de Aptitud para ML (fitness-for-use) — `quality.py:assess_ml_readiness`
| Caso de uso | Regla |
|---|---|
| **Clasificación** | necesita columna categórica con **2–20 clases** + **≥100 filas**; *limitado* si desbalance (ratio min/max < **0.2**) |
| **Regresión** | necesita variable numérica continua (>20 valores) + **≥100 filas** |
| **Clustering** | necesita **≥2 features numéricas** + **≥50 filas** (no requiere target) |
| **Series temporales** | necesita una columna con **>80%** de valores parseables como fecha |
| Detección de target | categórico: cardinalidad 2–20 · continuo: numérico con >20 valores distintos | 
| Interpretación performance | F1: ≥0.8 alta, ≥0.6 media, resto baja · R²: ≥0.6 alta, ≥0.3 media | `quality_validate.py` |
| Interpretación etiquetas | ≥85 coherentes, ≥70 algunas dudosas, resto ruido | `quality_validate.py` |

### D. Machine Learning (modelos)

| Modelo / técnica | Config exacta | Para qué | Dónde |
|---|---|---|---|
| **Isolation Forest** | `contamination="auto"`, `n_estimators=100`, `random_state=42` | Detección de anomalías → dimensión **Exactitud** | `quality.py:detect_outliers` |
| **Random Forest (baseline)** | `n_estimators=120`, `random_state=42`; `cross_val_score` | **Performance** real (utilidad ML): `f1_weighted` (clasificación) o `r2` (regresión) | `quality_validate.py` |
| **Calidad de etiquetas** | `cross_val_predict` + tasa de **desacuerdo** del modelo (idea *confident learning / Cleanlab*) | Estima ruido de etiquetas sin ground-truth | `quality_validate.py`, `experiment_correlation.py` |
| **NNLS** (non-negative least squares) | ajusta pesos ≥0 que mejor predicen performance, normalizados a sumar 1 | **Aprender los pesos** del score desde datos | `experiment_correlation.py:learn_weights` |
| Codificación de features | numéricas: imputación por **mediana** · categóricas (≤50 valores): **LabelEncoder** | Preparar datos para los modelos | `quality_validate.py` |
| Folds de CV | `min(5, max(2, n_filas // 10))` | Validación cruzada robusta a datasets chicos | varios |

### E. Reproducibilidad (qué se guarda de cada análisis)
`sampleSha256` (hash del contenido analizado) · `fileBytes` · `rowsAnalyzed` · `maxRows` ·
`configVersion` · `engineVersion` · `analyzedAt`. En la URL, además: `url`, `maxMb`, `downloadedAt`.

### F. Experimentos científicos (validación de H1)
| Exp | Método | Resultado obtenido |
|---|---|---|
| **1. Correlación** | calidad + RF baseline sobre corpus → Pearson/Spearman + pesos NNLS | Corr ≈ **−0.19** (datasets limpios sin varianza de calidad) |
| **2. Degradación features** | inyecta faltantes + duplicados crecientes en un dataset | Corr ≈ **−0.39** (RF + imputación absorbe el deterioro) |
| **3. Degradación etiquetas** ⭐ | voltea % de etiquetas + estima calidad de etiquetas | Calidad etiquetas vs performance: **0.99** · combinado: **0.99** → **apoya H1** |

### G. Resumen "qué es cada cosa"
- **Estadística** hace el grueso de la medición (completitud, duplicados, distribuciones, tests).
- **Heurística** define los pesos, los umbrales y las reglas de aptitud (transparentes y versionados).
- **ML** aporta lo que las reglas no pueden: anomalías multivariadas (Isolation Forest), utilidad real
  (Random Forest), calidad de etiquetas (confident learning) y pesos aprendidos (NNLS).

---

## ▶️ Cómo levantarlo local

```bash
# 1. Base de datos (Docker)
docker compose up -d db

# 2. Backend
cd backend && npm run dev          # → http://localhost:3001

# 3. Frontend
cd frontend && npm run dev         # → http://localhost:5173
```

**Usuarios de prueba (seed):**
- Investigadora → `flor@uai.edu.ar` / `flor123`
- Admin → `admin@caeti.uai.edu.ar` / `Admin123!`

---

## 🔬 La hipótesis científica (el corazón del paper)

> **H1: los datasets con mayor Quality Score producen mejor performance en modelos baseline.**

Para contrastarla hay **dos experimentos implementados y corridos**. Lo importante: los
resultados son **honestos**, no confirmatorios — y eso es ciencia, no marketing.

### Experimento 1 — Correlación sobre un corpus (`experiment_correlation.py`)
Corre calidad + baseline ML sobre 6 datasets reales y correlaciona score↔performance.
Además **aprende los pesos óptimos de los datos** (NNLS) → responde *"¿por qué esos pesos?"*.

**Resultado (n=6):** correlación Score↔Performance ≈ **−0.19 (Pearson)**. Casi nula.
**Por qué:** todos los datasets eran benchmarks limpios → scores casi iguales (89–95) →
sin varianza no hay correlación posible. *Hallazgo: el corpus necesita calidad VARIADA.*

### Experimento 2 — Degradación controlada (`experiment_degradation.py`)
Toma **un** dataset (Titanic) y le inyecta deterioro creciente; mide cómo caen score y performance.
Es más fuerte porque es el mismo dataset (performance comparable entre niveles).

| Deterioro | Quality Score | Performance |
|---|---|---|
| 0% | 89 | 0.796 |
| 20% | 83 | 0.793 |
| 40% | 71 | 0.800 |

**Resultado (modo `features`):** el score baja con el deterioro, **pero la performance casi no cae** (corr ≈ −0.39).
**Por qué:** Random Forest + imputación es **robusto** a faltantes/duplicados moderados → absorbe el deterioro.

### Experimento 3 — Ruido de etiquetas (`experiment_degradation.py --mode labels`) ⭐
Voltea un % creciente de **etiquetas** del target (sin tocar features) y agrega una nueva señal:
**calidad de etiquetas** estimada por desacuerdo del modelo en validación cruzada (idea de *confident
learning / Cleanlab*, en `estimate_label_quality`).

| Ruido | Score features | Calidad etiquetas | Performance |
|---|---|---|---|
| 0% | 89 | 80.6 | 0.796 |
| 30% | 90 | 57.5 | 0.564 |
| 50% | 90 | 47.9 | 0.412 |

**Correlación con la performance (Pearson):**
- Score de **features** solo: **−0.87** → *ciego* al problema (no toca features).
- **Calidad de etiquetas: 0.992**.
- **Score combinado (features + etiquetas): 0.992**.

> ✅ **Evidencia a favor de H1**: cuando el score incorpora la calidad de etiquetas, **predice la
> performance casi perfecto (0.99)**. El gap no era la idea, era que faltaba medir la calidad de etiquetas.

### 📌 Conclusión honesta (esto ES el paper)
1. En datasets limpios, el score de features no discrimina (falta varianza de calidad) — *Exp. 1*.
2. Modelos robustos + imputación absorben el deterioro de features — *Exp. 2*.
3. **Pero al medir también la calidad de etiquetas, el score predice la performance (corr 0.99)** — *Exp. 3*.
   → La contribución concreta: **un Quality Score que combina calidad de features Y de etiquetas SÍ predice utilidad para ML.**

> El recorrido completo (nulo → diagnóstico → solución) es exactamente la narrativa de un paper sólido.

## ✅ Ya resuelto

- **Reproducibilidad** — hash del sample + parámetros + versión del scoring (sección 6).
- **Transparencia del score** — desglose por dimensión con pesos versionados.
- **Pipeline de datos reales** — descarga + análisis del dataset, no solo metadatos.
- **Maquinaria experimental** — los dos experimentos corren y generan reportes (`experiment_*_results.md`).
- **Calidad de etiquetas en la app** — el bloque "Validación predictiva" muestra, al elegir un target de
  clasificación: **Calidad de etiquetas** (0–100), **Score combinado** (features + etiquetas) y un aviso
  si hay muchas etiquetas sospechosas. Es el hallazgo del paper, ya en el producto.

## 🔭 Lo que falta (próximos pasos)

- **Corpus de calidad variada**: sumar datasets sucios reales (no solo benchmarks) para el Exp. 1.
- **Interpretación por dominio**: que "68% de completitud" se juzgue distinto en salud vs economía.

> Cómo correr los experimentos:
> ```bash
> cd python
> python experiment_correlation.py              # → experiment_results.md
> python experiment_degradation.py              # features (faltantes/duplicados)
> python experiment_degradation.py --mode labels   # ⭐ ruido de etiquetas → apoya H1
> # ambos modos escriben experiment_degradation_results.md
> ```

---

_Fundamentado en dimensiones inspiradas en ISO/IEC 25012 · Laboratorio de Calidad y Ciencia de Datos · UAI–CAETI_

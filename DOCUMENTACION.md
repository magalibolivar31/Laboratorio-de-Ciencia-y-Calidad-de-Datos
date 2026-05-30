# Repositorio de Datasets de Salud — CAETI UAI

**Proyecto**: CACIC - SALUD  
**Institución**: CAETI, Universidad Abierta Interamericana  
**Directora**: Dra. Ing. Roxana Martínez (Ph.D.)  
**Equipo**: Maga, Flor, Mati  
**Sede**: Av. Montes de Oca 745, CABA  
**Archivo de salida**: `REPOSITORIO_SALUD_2022.xlsx`

---

## Contexto institucional

Este proyecto se desarrolla en el **Laboratorio de Calidad y Ciencia de Datos** del CAETI (UAI), un espacio de investigación e innovación orientado al estudio y aplicación de metodologías para la calidad de datos, la interoperabilidad y el uso de inteligencia artificial en la validación y mejora de la información.

El laboratorio, activo desde marzo de 2025 y dirigido por la **Dra. Ing. Roxana Martínez**, trabaja con un enfoque interdisciplinario que combina ingeniería de software, análisis de datos e IA, con foco en datos públicos, gobierno abierto y transformación digital. Entre sus líneas de investigación se destacan la evaluación de calidad de datos, la detección automática de sesgos y anomalías, y la interoperabilidad semántica entre sistemas.

---

## ¿De qué se trata?

Se construyó un repositorio centralizado de datasets de salud públicos, recolectados automáticamente desde múltiples plataformas. El resultado es **`REPOSITORIO_SALUD_2022.xlsx`**, un Excel catalogado con metadata enriquecida de cada dataset, pensado para facilitar la búsqueda y selección de datos para investigación en salud e inteligencia artificial.

Este trabajo se enmarca en la línea de **evaluación y aseguramiento de la calidad de datos en el dominio salud**, aportando una base curada y estructurada que puede ser utilizada en proyectos de investigación, tesis de grado y posgrado, y desarrollos de IA aplicada a medicina dentro del laboratorio y la UAI.

---

## ¿Qué se hizo?

Todo el proceso está automatizado en **un único script de Python**: `cacic_salud.py`. El script ejecuta el flujo completo de punta a punta:

> **Scraping → Limpieza → Enriquecimiento → Filtro (≥ 2022) → Excel final**

### Fuentes consultadas

La recolección se hace **en paralelo** sobre repositorios públicos de datasets:

| Fuente | Tipo de acceso | Estado |
|---|---|---|
| **Zenodo** | API REST (requiere token para evitar bloqueo de requests anónimos) | Activa |
| **Hugging Face Hub** | API REST pública (token opcional, sube el rate limit) | Activa |
| **HealthData.gov** | API Socrata (datos abiertos del gobierno de EE.UU.) | Activa |
| **UCI ML Repository** | API JSON oficial | Activa |
| **Kaggle** | API oficial con autenticación | Activa |
| **PhysioNet** | Scraping HTML | Implementada (desactivada por defecto) |

La búsqueda se realiza sobre un conjunto de **~75 palabras clave en inglés y español** que se envían a cada API para filtrar resultados relevantes:

| Categoría | Keywords |
|---|---|
| Términos generales | `health`, `medical`, `clinical`, `disease`, `patient`, `hospital`, `diagnosis`, `treatment` |
| Enfermedades | `cancer`, `diabetes`, `alzheimer`, `parkinson`, `obesity`, `hypertension`, `asthma`, `sepsis`, `stroke`, `dementia`, `tuberculosis` |
| Especialidades | `oncology`, `cardiology`, `neurology`, `dermatology`, `pediatrics`, `psychiatry`, `immunology`, `pathology`, `pharmacology`, `ophthalmology` |
| Tecnología médica | `ehr`, `radiology`, `genomic`, `ECG`, `MRI`, `drug`, `mortality`, `covid`, `biomedical` |
| Salud pública | `epidemiol`, `vaccine`, `surveillance`, `morbidity`, `public health`, `population health`, `registry`, `virus`, `infection`, `syndrome` |
| Español | `salud`, `clinica`, `paciente`, `hospitalario`, `enfermedad`, `diagnostico`, `tratamiento`, `epidemiologia`, `salud mental` |

### Clasificación automática

Por cada dataset encontrado, el script extrae nombre, descripción, fuente, link, formato, año y autor, y lo **clasifica en dos dimensiones** mediante un sistema de *scoring por keywords* (cuenta coincidencias por categoría y asigna la de mayor puntaje):

- **Área médica**: 15 categorías + "General / Multidisciplinar" (oncología, cardiología, neurología, diabetes/endocrinología, imagen médica, genómica/bioinformática, salud mental, epidemiología/salud pública, UCI/cuidados intensivos, respiratorio, farmacología, pediatría/neonatal, señales/fisiología, dermatología, oftalmología).
- **Tipo de dato**: 8 categorías (imágenes médicas, señales fisiológicas, genómico, EHR, epidemiológico, texto clínico/NLP, señales de audio, clínico tabular).

También detecta el **formato de archivo** (CSV, DICOM, FASTA, WFDB, Parquet, NIfTI, HDF5, entre otros) y el **idioma**.

### Enriquecimiento y robustez

- **Año de actualización**: tras la recolección, el script vuelve a consultar las APIs de cada fuente (en paralelo, con *workers*) para completar el año de última actualización de cada dataset.
- **Checkpoint**: guarda el progreso del enriquecimiento (`cacic_checkpoint.csv`) para poder reanudar sin repetir consultas.
- **Reintentos** automáticos con *backoff* y *timeouts* cortos para sobrevivir a fuentes caídas o lentas.
- **Reporte QA** (`QA_REPORT.md`): métricas por fuente (éxito/error/duplicados), cobertura del enriquecimiento, distribución de relevancia, completitud y áreas.

El resultado final, ya filtrado y deduplicado, se exporta a `REPOSITORIO_SALUD_2022.xlsx` con dos hojas: **DATASETS - SALUD** (el catálogo, 19 columnas) y **RESUMEN** (totales por relevancia, área y fuente).

---

## Filtros aplicados

El script aplica una cadena de filtros que determina qué datasets entran finalmente al repositorio. Se ejecutan en este orden:

### 1. Filtro temático — ¿es de salud? (`is_health`)

Primer colador. Cada dataset (título + descripción + tags) debe coincidir con **al menos una** de las ~75 palabras clave médicas en inglés y español. Lo que no es de salud se descarta.

> **Detalle técnico**: el match usa *word boundary* al inicio del término (`\bcancer`), no coincidencia por substring. Esto corrige un bug donde `"cancer" in "dancer"` daba verdadero, y permite matchear prefijos médicos (`epidemiol` → `epidemiology`) sin falsos positivos.

### 2. Filtro de duplicados (`deduplicate`)

Se eliminan repetidos por:
- **Link** idéntico, o
- **Nombre** del dataset normalizado (minúsculas, espacios colapsados).

### 3. Filtro temporal — el principal: **≥ 2022** (`classify_relevance`)

Cada dataset se clasifica en tres categorías según el corte `year_cutoff = 2022`:

| Categoría | Criterio |
|---|---|
| **Clásico** | El nombre figura entre los datasets de referencia (MIMIC, NHANES, TCGA, CheXpert, etc.) **o** la fuente es PhysioNet. *Pasa siempre, sin importar el año.* |
| **Reciente** | Año de actualización **o** año de publicación **≥ 2022** |
| **Antiguo** | Todo lo demás (año < 2022) |

> Por eso en el Excel pueden aparecer datasets con año de publicación anterior a 2022: entran porque su **año de actualización** es ≥ 2022, o porque son "clásicos".

### 4. Filtro de salida final

Al Excel final **solo entran** los datasets marcados como **`Reciente` + `Clásico`**. Los **`Antiguo`** quedan **excluidos** del `.xlsx` (aunque sí se registran en el log CSV para trazabilidad).

### Resumen en una línea

> Entra al repositorio un dataset si **(1)** es de salud, **(2)** no está duplicado, y **(3)** fue publicado o actualizado en 2022 o después — *salvo* los datasets "clásicos" (MIMIC, NHANES, PhysioNet, etc.), que entran siempre por su valor de referencia.

Los demás clasificadores (área médica, tipo de datos, formato, idioma) **no descartan filas**: solo etiquetan cada dataset.

---

## Estructura del Excel (19 columnas)

| # | Columna | # | Columna |
|---|---|---|---|
| 1 | Nro | 11 | Cant. variables |
| 2 | Nombre del dataset | 12 | Año publicación |
| 3 | Área médica | 13 | Año actualización |
| 4 | Tipo de datos | 14 | Link |
| 5 | Fuente | 15 | Idioma |
| 6 | Autor / Institución | 16 | Breve descripción |
| 7 | País | 17 | Propuesta / Objetivo |
| 8 | Cant. registros | 18 | Observaciones |
| 9 | Tipo de formato | 19 | Integrante responsable |
| 10 | Variables principales | | |

---

## Resultado

`REPOSITORIO_SALUD_2022.xlsx` es el producto final del proceso. Estado actual del archivo:

**Total de datasets en el repositorio final: 1.386**

**Por fuente:**

| Fuente | Datasets |
|---|---|
| Zenodo | 466 |
| Hugging Face Hub | 454 |
| HealthData.gov | 377 |
| UCI ML Repository | 46 |
| Kaggle | 43 |
| **Total** | **1.386** |

**Por área médica (top):**

| Área médica | Datasets |
|---|---|
| General / Multidisciplinar | 538 |
| Epidemiología / Salud Pública | 248 |
| Farmacología | 91 |
| Imagen Médica | 87 |
| Genómica / Bioinformática | 78 |
| Oncología | 76 |
| Neurología | 41 |
| Cardiología | 41 |
| Diabetes / Endocrinología | 36 |
| Pediatría / Neonatal | 33 |
| Salud Mental | 31 |
| UCI / Cuidados Intensivos | 24 |
| Respiratorio | 24 |
| Dermatología | 17 |
| Oftalmología | 11 |
| Señales / Fisiología | 10 |

**Por tipo de dato:**

| Tipo de dato | Datasets |
|---|---|
| Clínico (tabular) | 590 |
| Epidemiológico | 239 |
| Texto clínico (NLP) | 190 |
| Imágenes médicas | 177 |
| Genómico | 148 |
| EHR (Historia Clínica) | 24 |
| Señales de audio | 11 |
| Señales fisiológicas | 7 |

**Idioma:** predominantemente inglés, con una minoría en español y otros idiomas.

---

## Archivos del proyecto

| Archivo | Descripción |
|---|---|
| `cacic_salud.py` | Script único: hace todo el flujo (scraping → limpieza → enriquecimiento → filtro → Excel) |
| `REPOSITORIO_SALUD_2022.xlsx` | Repositorio final catalogado (producto del proceso) |
| `requirements.txt` | Dependencias Python necesarias para ejecutar |
| `DOCUMENTACION.md` | Este documento |
| `.env` | Secretos / tokens de API (no se versiona) |

**Archivos generados en cada ejecución (no se versionan):**

| Archivo | Descripción |
|---|---|
| `cacic_salud_log.csv` | Log por dataset (año, fuente del año, status, relevancia) |
| `QA_REPORT.md` | Reporte de control de calidad de la corrida |
| `cacic_checkpoint.csv` | Checkpoint para reanudar el enriquecimiento |
| `cacic_salud.log` | Log de ejecución detallado |

---

## ¿Cómo se usa?

```bash
# 1. Instalar dependencias (una sola vez)
pip install -r requirements.txt

# 2. Configurar secretos: copiar .env.example a .env y completar
#    (al menos ZENODO_TOKEN, ya que la red bloquea requests anónimos a Zenodo)

# 3. Ejecutar el flujo completo
python cacic_salud.py
```

Al terminar genera `REPOSITORIO_SALUD_2022.xlsx`, `cacic_salud_log.csv` y `QA_REPORT.md`.

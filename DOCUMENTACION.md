# Repositorio de Datasets de Salud — CAETI UAI

**Proyecto**: CACIC - SALUD  
**Institución**: CAETI, Universidad Abierta Interamericana  
**Directora**: Dra. Ing. Roxana Martínez (Ph.D.)  
**Equipo**: Maga, Flor, Mati  
**Sede**: Av. Montes de Oca 745, CABA  

---

## Contexto institucional

Este proyecto se desarrolla en el **Laboratorio de Calidad y Ciencia de Datos** del CAETI (UAI), un espacio de investigación e innovación orientado al estudio y aplicación de metodologías para la calidad de datos, la interoperabilidad y el uso de inteligencia artificial en la validación y mejora de la información.

El laboratorio, activo desde marzo de 2025 y dirigido por la **Dra. Ing. Roxana Martínez**, trabaja con un enfoque interdisciplinario que combina ingeniería de software, análisis de datos e IA, con foco en datos públicos, gobierno abierto y transformación digital. Entre sus líneas de investigación se destacan la evaluación de calidad de datos, la detección automática de sesgos y anomalías, y la interoperabilidad semántica entre sistemas.

---

## ¿De qué se trata?

Se construyó un repositorio centralizado de datasets de salud públicos, recolectados automáticamente desde múltiples plataformas. El resultado es un **Excel catalogado** con metadata enriquecida de cada dataset, pensado para facilitar la búsqueda y selección de datos para investigación en salud e inteligencia artificial.

Este trabajo se enmarca en la línea de **evaluación y aseguramiento de la calidad de datos en el dominio salud**, aportando una base curada y estructurada que puede ser utilizada en proyectos de investigación, tesis de grado y posgrado, y desarrollos de IA aplicada a medicina dentro del laboratorio y la UAI.

---

## ¿Qué se hizo?

Se desarrollaron dos scripts Python que automatizan todo el proceso:

### 1. Recolección — `scraper_datasets_salud.py`

Busca y descarga automáticamente información de datasets desde cuatro fuentes públicas:

- **Kaggle** — plataforma de ciencia de datos
- **UCI ML Repository** — repositorio de datasets para machine learning
- **HealthData.gov** — datos de salud del gobierno de EE.UU.
- **Hugging Face** — repositorio de datasets de IA

La búsqueda se realiza sobre un conjunto de **palabras clave en inglés y español** que se envían directamente a cada API para filtrar resultados relevantes:

| Categoría | Keywords |
|---|---|
| Términos generales | `health`, `medical`, `clinical`, `disease`, `patient`, `hospital`, `diagnosis`, `treatment` |
| Enfermedades | `cancer`, `diabetes`, `alzheimer`, `parkinson`, `obesity`, `hypertension`, `asthma`, `sepsis`, `stroke`, `dementia`, `tuberculosis` |
| Especialidades | `oncology`, `cardiology`, `neurology`, `dermatology`, `pediatrics`, `psychiatry`, `immunology`, `pathology`, `pharmacology`, `ophthalmology` |
| Tecnología médica | `ehr`, `radiology`, `genomic`, `ECG`, `MRI`, `drug`, `mortality`, `covid`, `biomedical` |
| Salud pública | `epidemiol`, `vaccine`, `surveillance`, `morbidity`, `public health`, `population health`, `registry`, `virus`, `infection`, `syndrome` |
| Español | `salud`, `clinica`, `paciente`, `hospitalario`, `enfermedad`, `diagnostico`, `tratamiento`, `epidemiologia`, `salud mental` |

Por cada dataset encontrado, el script extrae automáticamente su nombre, descripción, fuente, link, formato, año y autor, y lo **clasifica en dos dimensiones**:

- **Área médica**: 15 categorías (oncología, cardiología, neurología, diabetes, imagen médica, genómica, salud mental, epidemiología, UCI, respiratorio, farmacología, pediatría, señales fisiológicas, dermatología, oftalmología)
- **Tipo de dato**: 8 categorías (imágenes médicas, señales fisiológicas, genómico, EHR, epidemiológico, texto clínico/NLP, señales de audio, clínico tabular)

La clasificación se realiza mediante un sistema de scoring por keywords: el script analiza el nombre y descripción del dataset, cuenta las coincidencias con los términos de cada categoría y asigna la de mayor puntaje.

El scraper también detecta el **formato de archivo** (CSV, DICOM, FASTA, WFDB, Parquet, NIfTI, HDF5, entre otros) y maneja de forma robusta los fallos de red mediante reintentos automáticos con backoff exponencial. Todas las fuentes se consultan **en paralelo** para reducir el tiempo total de ejecución.

Los resultados se integran al archivo `CACIC_COLGATE.xlsx` existente, eliminando duplicados antes de agregar las nuevas filas y preservando el formato visual del Excel.

### 2. Limpieza — `limpiar_datasets.py`

Procesa el Excel generado y aplica una serie de mejoras:

- Elimina duplicados (exactos y por similitud de nombre)
- Filtra datasets que no son relevantes para salud
- Corrige y completa clasificaciones faltantes
- Infiere campos vacíos (fuente, país, idioma) a partir de la URL
- Renumera el listado de forma secuencial
- Genera una hoja de auditoría con todos los cambios aplicados

---

## Resultado

El archivo `CACIC_COLGATE.xlsx` es el producto final del proceso. A continuación el detalle de la última ejecución (13/05/2026):

**Datasets previos en el archivo (carga manual preexistente): 1.146**

| Fuente | Datasets scrapeados | Nuevos agregados (sin duplicados) |
|---|---|---|
| Kaggle | 500 (límite por ejecución) | 448 |
| HealthData.gov | 494 | 494 |
| Hugging Face Hub | 334 | 307 |
| UCI ML Repository | 46 | 46 |
| Zenodo | 0 (errores HTTP 400) | 0 |
| **Total** | **1.384** | **1.295** |

- Duplicados detectados y eliminados: **89**
- **Total final en el archivo: 1.393 datasets**

**Fuentes activas:**

| Fuente | Tipo de acceso |
|---|---|
| Kaggle | API oficial con autenticación |
| HealthData.gov | API Socrata (datos abiertos del gobierno de EE.UU.) |
| Hugging Face Hub | API REST pública |
| UCI ML Repository | Librería oficial `ucimlrepo` |

**Áreas médicas presentes en el repositorio:**

El repositorio combina dos tipos de clasificación: las asignadas **manualmente** por el equipo en los primeros datasets (más específicas y granulares) y las asignadas **automáticamente** por el scraper usando el sistema de 15 categorías.

*Áreas de la carga manual (más específicas):*

| | |
|---|---|
| Cáncer de Mama | Enfermedades Cardiovasculares |
| UCI / Señales Clínicas Avanzadas | Cáncer de Pulmón y Oncología |
| Diabetes y Metabolismo | Diabetes y Factores de Riesgo |
| Salud Materna, Fetal y Reproductiva | Fertilidad y Salud Reproductiva |
| Enfermedades Infecciosas y Vigilancia Epidemiológica | Sueño y Trastornos Respiratorios |
| Sistemas de Salud e Infraestructura | Salud Digital e Inteligencia Artificial |
| Salud Digital y Machine Learning | Equidad en Salud y Calidad Hospitalaria |
| Tecnología Quirúrgica y Neurociencia Aplicada | Economía de la Salud y Financiamiento |
| Enfermedades Renales | Mortalidad y Epidemiología |
| Discapacidad y Rehabilitación | Salud Ambiental |
| Cardiopatía | Hepatitis · Parkinson · Obesidad · Anemia · Asma · Tiroidea |

*Áreas del scraper automático (15 categorías):*

| | |
|---|---|
| Epidemiología / Salud Pública | General / Multidisciplinar |
| Genómica / Bioinformática | Oncología |
| Imagen Médica | Salud Mental |
| Cardiología | Farmacología |
| Neurología | Diabetes / Endocrinología |
| UCI / Cuidados Intensivos | Respiratorio |
| Oftalmología | Pediatría / Neonatal |
| Señales / Fisiología | Dermatología |

**Tipos de datos clasificados (8):**

| Tipo | Ejemplos de términos que lo identifican |
|---|---|
| Imágenes médicas | MRI, CT, X-ray, DICOM, PNG, fundus, scan |
| Señales fisiológicas | ECG, EEG, EMG, WFDB, EDF, time series |
| Genómico | DNA, RNA, FASTA, VCF, sequence, microarray |
| EHR (Historia Clínica) | electronic health record, MIMIC, clinical notes, discharge |
| Epidemiológico | survey, population, COVID, mortality, registry, census |
| Texto clínico (NLP) | clinical notes, discharge summary, NLP, annotation |
| Señales de audio | audio, speech, cough, respiratory sound, voice |
| Clínico (tabular) | clinical, diagnosis, patient, hospital, CSV, laboratory |

---

## Archivos del proyecto

| Archivo | Descripción |
|---|---|
| `CACIC_COLGATE.xlsx` | Base de datos principal con todos los datasets |
| `scraper_datasets_salud.py` | Script de recolección automática |
| `limpiar_datasets.py` | Script de limpieza y enriquecimiento |
| `requirements.txt` | Dependencias Python necesarias para ejecutar |
| `scraper_output.txt` | Resumen de la última ejecución del scraper |
| `scraper.log` / `enriquecimiento.log` | Logs de ejecución detallados |

---

## ¿Cómo se usa?

```bash
# 1. Instalar dependencias (una sola vez)
pip install -r requirements.txt

# 2. Recolectar nuevos datasets
python scraper_datasets_salud.py

# 3. Limpiar y mejorar el Excel resultante
python limpiar_datasets.py
```

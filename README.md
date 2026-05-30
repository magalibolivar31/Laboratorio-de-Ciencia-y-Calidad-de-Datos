# Repositorio de Datasets de Salud — CAETI UAI

Recolección automática y catalogación de **datasets de salud públicos** desde múltiples plataformas, en un único Excel curado y enriquecido: **`REPOSITORIO_SALUD_2022.xlsx`**.

> **Laboratorio de Calidad y Ciencia de Datos — CAETI, Universidad Abierta Interamericana**
> Directora: Dra. Ing. Roxana Martínez · Equipo: Maga, Flor, Mati

---

## ¿Qué hace?

Un solo script (`cacic_salud.py`) ejecuta todo el flujo de punta a punta:

```
Scraping → Limpieza → Enriquecimiento → Filtro (≥ 2022) → Excel final
```

- **Scrapea en paralelo** 5 fuentes públicas de datasets de salud.
- **Clasifica** cada dataset por área médica (15 categorías) y tipo de dato (8 categorías).
- **Enriquece** la metadata consultando las APIs (año de actualización, formato, idioma).
- **Filtra** por relevancia temporal (≥ 2022) y deduplica.
- **Exporta** a `REPOSITORIO_SALUD_2022.xlsx` (hojas *DATASETS - SALUD* y *RESUMEN*) + log CSV + reporte de QA.

## Fuentes

| Fuente | Acceso | Estado |
|---|---|---|
| Zenodo | API REST (requiere token) | Activa |
| Hugging Face Hub | API REST (token opcional) | Activa |
| HealthData.gov | API Socrata | Activa |
| UCI ML Repository | API JSON | Activa |
| Kaggle | API oficial con auth | Activa |
| PhysioNet | Scraping HTML | Desactivada por defecto |

## Filtros aplicados

Un dataset entra al repositorio si:

1. **Es de salud** — coincide con ≥ 1 de ~75 keywords médicas (ES/EN).
2. **No está duplicado** — por link o nombre normalizado.
3. **Es ≥ 2022** — año de publicación **o** de actualización ≥ 2022.

> Excepción: los datasets **"clásicos"** de referencia (MIMIC, NHANES, TCGA, CheXpert, PhysioNet…) entran siempre, sin importar el año.

Detalle completo en [`DOCUMENTACION.md`](DOCUMENTACION.md).

## Resultado actual

**1.386 datasets** en el repositorio final.

| Fuente | Datasets |
|---|---|
| Zenodo | 466 |
| Hugging Face Hub | 454 |
| HealthData.gov | 377 |
| UCI ML Repository | 46 |
| Kaggle | 43 |

## Uso

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Configurar secretos: copiar .env.example a .env y completar
#    (al menos ZENODO_TOKEN — la red bloquea requests anónimos a Zenodo)

# 3. Ejecutar
python cacic_salud.py
```

Genera `REPOSITORIO_SALUD_2022.xlsx`, `cacic_salud_log.csv` y `QA_REPORT.md`.

## Estructura

| Archivo | Descripción |
|---|---|
| `cacic_salud.py` | Script único con todo el flujo |
| `REPOSITORIO_SALUD_2022.xlsx` | Repositorio final catalogado (19 columnas) |
| `DOCUMENTACION.md` | Documentación detallada del proceso y los filtros |
| `requirements.txt` | Dependencias Python |
| `.env` | Tokens de API (no se versiona) |

Archivos regenerables (no se versionan): `cacic_salud_log.csv`, `QA_REPORT.md`, `cacic_checkpoint.csv`, `cacic_salud.log`.

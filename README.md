# UAI | CAETI - Laboratorio de Ciencias de Datos

![Institución](https://img.shields.io/badge/Institución-UAI-red)
![Centro](https://img.shields.io/badge/Centro-CAETI-black)
![Estado](https://img.shields.io/badge/Estado-Producción-green)

Bienvenido al sistema oficial del **Laboratorio de Análisis y Calidad de Datos del CAETI (UAI)**. Este entorno ha sido diseñado para la investigación avanzada, permitiendo la búsqueda, filtrado y generación de datasets científicos de alta calidad de forma automatizada.
shshhshshshshshshshssh
---

## 🚀 Características Principales

### 1. Motor de Búsqueda Multifuente (Robot ETL)
Nuestro motor integrado en Python consulta en tiempo real las APIs de las plataformas de datos más importantes del mundo:
*   **Fuentes Soportadas:** Zenodo, Kaggle, Hugging Face, UCI Machine Learning Repository y HealthData.gov.
*   **Limpieza Automática:** Filtrado de etiquetas HTML y normalización de texto para reportes legibles.
*   **Exportación Inteligente:** Generación dinámica de archivos Excel (.xlsx) con 19 columnas técnicas detalladas.

### 2. Bóveda de Conexiones API
*   **Búsqueda Integral:** Uso de llaves maestras del servidor para consultas masivas.
*   **Gestión Personalizada:** Interfaz para agregar, editar y eliminar tus propios tokens de acceso (Zenodo, Kaggle, etc.).

### 3. Interfaz Profesional (Glassmorphism)
*   Diseño moderno basado en la identidad institucional de la **UAI**.
*   **Dashboard Expandido:** Grilla de datos gigante con scroll inteligente y encabezados fijos.
*   **Acceso Seguro:** Sistema de autenticación para investigadores.

---

## 🛠️ Estructura del Proyecto

```bash
├── backend/            # Servidor Node.js + Express + Prisma (PostgreSQL)
├── frontend/           # Interfaz React + Tailwind CSS (Diseño Glassmorphism)
├── python/             # Motor ETL y Scrapers (etl.py)
├── exports/            # Archivos Excel generados por el sistema
└── imagenes/           # Recursos visuales e identidad corporativa
```

---

## 🔧 Instalación y Configuración

### 1. Requisitos Previos
*   Node.js (v18+)
*   Python 3.10+
*   PostgreSQL

### 2. Configuración del Servidor (Backend)
```bash
cd backend
npm install
npx prisma migrate dev  # Sincronizar base de datos
npm run dev             # Inicia en http://localhost:3001
```

### 3. Configuración de la Web (Frontend)
```bash
cd frontend
npm install
npm run dev             # Inicia en http://localhost:5173
```

### 4. Variables de Entorno (.env)
Copia el archivo `.env.example` a `.env` en la carpeta `backend` y completa las llaves:
*   `DATABASE_URL`: Conexión a PostgreSQL.
*   `ZENODO_TOKEN`, `KAGGLE_KEY`, `HUGGINGFACE_TOKEN`: Llaves oficiales del laboratorio.

---

## 📄 Columnas del Repositorio Generado
El sistema genera reportes con los siguientes campos:
1. **Nro** | 2. **Nombre** | 3. **Área Médica** | 4. **Tipo de Datos** | 5. **Fuente** | 6. **Institución** | 7. **País** | 8. **Registros** | 9. **Formato** | 10. **Variables** | 11. **Cant. Var** | 12. **Año Pub** | 13. **Año Act** | 14. **Link** | 15. **Idioma** | 16. **Descripción** | 17. **Propuesta** | 18. **Observaciones** | 19. **Responsable**.

---

## 🏛️ Créditos
**Laboratorio de Ciencias de Datos - CAETI**  
*Universidad Abierta Interamericana*  
Investigadora Principal: **Flor Gomez**

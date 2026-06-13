# Arquitectura y Estado del Proyecto: Laboratorio de Ciencia y Calidad de Datos

Este documento describe la estructura técnica, la organización de carpetas y el estado actual de desarrollo del sistema.

---

## 1. Arquitectura del Sistema 🏗️

El proyecto utiliza una **Arquitectura de Tres Capas (Three-Tier Architecture)** para garantizar escalabilidad, seguridad y profesionalismo.

### **Capa 1: Frontend (Interfaz de Usuario)**
*   **Tecnologías:** React + TypeScript + Tailwind CSS.
*   **Función:** Es lo que el usuario ve en su navegador. Gestiona la navegación, los formularios y muestra los resultados de las búsquedas.
*   **Estado:** Profesional y visualmente terminado. Colores institucionales aplicados.

### **Capa 2: Backend (Servidor de Aplicación)**
*   **Tecnologías:** Node.js + Express.
*   **Función:** Actúa como el "cerebro" y puente. Gestiona la seguridad (Login), guarda las API Keys de los usuarios y coordina la ejecución del motor de Python.
*   **Estado:** Funcional. Posee rutas para autenticación y para disparar búsquedas en el motor.

### **Capa 3: Motor de Datos (Python ETL)**
*   **Tecnologías:** Python (Pandas, Requests, OpenPyXL).
*   **Función:** Es el "robot" que realiza el trabajo sucio. Entra a las APIs científicas, limpia los datos y fabrica los archivos Excel (.xlsx) con las 19 columnas reglamentarias.
*   **Estado:** Dinámico. Ahora recibe palabras clave desde la web y genera reportes únicos.

---

## 2. Estructura de Carpetas 📂

```text
/Laboratorio-de-Ciencia-y-Calidad-de-Datos
├── /backend            # Código del servidor Node.js
│   ├── /src            # Controladores, rutas y lógica
│   └── /prisma         # Esquema de la Base de Datos
├── /frontend           # Aplicación web React
│   ├── /src            # Pantallas (Pages) y componentes
│   └── /public         # Imágenes y assets estáticos
├── /python             # Motor de extracción de datos
│   └── etl.py          # Script principal de Scraping/Excel
├── /exports            # Carpeta donde se guardan los .xlsx generados
├── /Documentacion      # Guías, manuales y estado de situación
└── /imagenes           # Recursos visuales del proyecto
```

---

## 3. Estado de Situación Actual 📍

### **¿Qué funciona hoy?**
1.  **Navegación Completa:** Se puede navegar entre Login, Dashboard, Configuración y Exportaciones.
2.  **Buscador Inteligente:** Al buscar un tema, el Frontend se comunica con el Backend y este activa el script de Python.
3.  **Generación de Excel:** El robot de Python crea archivos reales en la carpeta `/exports`.
4.  **Descargas:** Los botones de descarga en la web ya disparan la bajada de archivos al navegador.
5.  **Personalización:** Cada usuario tiene su panel para gestionar sus propias API Keys.

### **¿Qué falta para finalizar?**
1.  **Migración a PostgreSQL:** Reemplazar SQL Server (que dio errores de puerto) por PostgreSQL para habilitar el guardado permanente de usuarios y sus claves.
2.  **Validación de Login Real:** Una vez instalada la base de datos, el formulario de login verificará contra la tabla de usuarios.

---

## 4. Próximos Pasos Técnicos 🚀

1.  **Instalar PostgreSQL** (Siguiendo la guía `estado_de_situacion_postgree.md`).
2.  **Actualizar el .env** con las credenciales de PostgreSQL.
3.  **Ejecutar Migración:** `npx prisma migrate dev` para crear las tablas finales.

---
*Documento actualizado al 12 de Junio de 2026.*

# Estado de Situación y Guía PostgreSQL - Laboratorio de Datos

## 1. Resumen de lo que hicimos hasta ahora 🚀

Pasamos de tener un script de Python suelto a construir una **Plataforma Científica Completa**. Aquí estás parada hoy:

### **A. Frontend (La Cara de tu Proyecto)**
*   **Interfaz Profesional:** Usamos React y TailwindCSS con los colores institucionales (Bordó UAI).
*   **Sistema de Usuarios:** Pantallas de Login y Registro listas para conectar.
*   **Buscador Inteligente:** Una barra de búsqueda que "despierta" al robot de Python.
*   **Gestión de API Keys:** Un panel de configuración para que cada investigador ponga sus propias llaves de Zenodo, Kaggle, etc.
*   **Historial de Exportaciones:** Una tabla para ver y descargar los archivos Excel generados previamente.
*   **Descargas Reales:** Implementamos la lógica para que al apretar "Descargar", el navegador baje el archivo `.xlsx` real.

### **B. Backend (El Cerebro)**
*   **Servidor Node.js:** Un servidor que coordina todo el tráfico.
*   **Puente con Python:** El servidor ahora sabe cómo darle órdenes al script de Python y recibir el archivo resultante.
*   **Seguridad:** Configurado con JWT (Tokens) para que solo usuarios registrados entren.

### **C. Motor (El Robot de Python)**
*   **Dinámico:** Ya no busca siempre lo mismo; ahora busca lo que vos le pidas desde la web.
*   **Generador de Reportes:** Crea archivos Excel con las 19 columnas que exige tu TFI (Nombre, Fuente, Registros, Links, etc.).

---

## 2. ¿Dónde estás parada? 📍

Tenés la **estructura 100% funcional**. Solo falta un detalle técnico: la **Base de Datos**. 
SQL Server nos dio problemas con los puertos (puerto 1433 bloqueado). Por eso, migrar a **PostgreSQL** es una excelente idea: es más liviano, más moderno y suele dar menos problemas de conexión en entornos de desarrollo.

---

## 3. Guía Paso a Paso: Instalación de PostgreSQL 🐘

Para que la web pueda guardar tus usuarios y tus API Keys sin errores, seguí estos pasos:

### **Paso 1: Descarga**
1. Andá a la página oficial: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Hacé clic en **"Download the installer"**.
3. Elegí la versión más reciente (ej. la 16 o 17) para **Windows x86-64**.

### **Paso 2: Instalación (El asistente)**
Ejecutá el archivo `.exe` que bajaste. Dale a "Next" en todo, pero prestá atención a esto:
1.  **Componentes:** Dejá todos marcados (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools).
2.  **Directorio de datos:** Dejá el que viene por defecto.
3.  **Contraseña (MUY IMPORTANTE):** Te va a pedir una contraseña para el usuario `postgres`. 
    *   *Sugerencia:* Poné la misma que veníamos usando o algo simple como `admin123`. **Anotala.**
4.  **Puerto:** Por defecto es el **5432**. Dejalo así.
5.  **Configuración Regional:** Elegí "Spanish, Argentina" o "Default locale".

### **Paso 3: Verificación (pgAdmin)**
1. Una vez instalado, buscá en tu inicio de Windows el programa **pgAdmin 4**.
2. Es una herramienta web que se abre en tu navegador para ver las tablas.
3. Te va a pedir la contraseña que pusiste en el Paso 2.
4. Si podés entrar y ver un "Server" llamado PostgreSQL, ¡estás lista!

### **Paso 4: Conectar con tu Proyecto**
Una vez que lo tengas, avisame y yo cambio el código de tu proyecto (que hoy busca SQL Server) para que apunte a **PostgreSQL**. Es un cambio rápido en el archivo `.env`.

---

**Documentación generada el:** 12 de Junio de 2026
**Responsable:** Gemini CLI x Flor Gomez

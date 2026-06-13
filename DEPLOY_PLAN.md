# 🚀 Plan de Despliegue en Dokploy — UAI | CAETI

Este documento detalla la estrategia para desplegar el **Laboratorio de Ciencias de Datos** de forma automatizada utilizando **Dokploy** y **GitHub**.

---

## 📋 Arquitectura de Despliegue

El sistema se compone de tres piezas clave que deben convivir en Dokploy:
1.  **Base de Datos:** PostgreSQL (Gestionada por Dokploy).
2.  **Backend (API + Motor Python):** Contenedor Docker personalizado (Node.js + Python).
3.  **Frontend (Web):** Sitio estático (Vite/React).

---

## 🛠️ Fase 1: Base de Datos (PostgreSQL)

1.  En el panel de Dokploy, ve a **"Databases"** y crea una nueva **PostgreSQL**.
2.  **Configuración:**
    *   **Name:** `tfi-db`
    *   **Database Name:** `tfi_laboratorio`
3.  Una vez creada, copia la **Internal Connection String** (ej: `postgres://user:pass@host:5432/db`). La usaremos en el Backend.

---

## ⚙️ Fase 2: El Backend (API + Motor ETL)

El Backend es el componente más complejo porque **necesita Node.js y Python** al mismo tiempo para que el robot funcione.

### 1. Crear el Servicio en Dokploy
1.  Crea un nuevo **"Application"** apuntando a tu repositorio de GitHub y la rama `FLORCITA`.
2.  **Root Directory:** `/backend`
3.  **Build Type:** Selecciona **Dockerfile**.

### 2. Variables de Entorno (Environment Variables)
Configura las siguientes llaves en el panel del Backend:
*   `DATABASE_URL`: (La URL que copiaste de la base de datos).
*   `PORT`: `3001`
*   `ZENODO_TOKEN`: Llave maestra.
*   `KAGGLE_KEY`: Llave maestra.
*   `HUGGINGFACE_TOKEN`: Llave maestra.
*   `BACKEND_URL`: La URL pública que le asigne Dokploy al backend (ej: `https://api-laboratorio.tudominio.com`).

### 3. Volúmenes Persistentes
Para que los archivos Excel no se borren cada vez que actualices el código:
1.  En Dokploy, ve a **"Volumes"**.
2.  Crea un montaje: `/exports` -> Carpeta interna del contenedor: `/app/exports`.

---

## 💻 Fase 3: El Frontend (Interfaz Web)

1.  Crea una nueva **"Application"** en Dokploy.
2.  **Root Directory:** `/frontend`
3.  **Build Type:** Nixpacks (Dokploy lo detectará automáticamente como Vite/React).
4.  **Variables de Entorno:**
    *   `VITE_API_URL`: La URL pública de tu backend (ej: `https://api-laboratorio.tudominio.com/api`).

---

## 🐳 Dockerfile Recomendado para el Backend

Para que el backend funcione, crea un archivo llamado `Dockerfile` dentro de la carpeta `/backend`:

```dockerfile
# Usa una imagen de Node.js estable
FROM node:18-slim

# Instalar Python y dependencias del sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Crear carpeta de la app
WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Instalar dependencias de Node
COPY package*.json ./
RUN npm install

# Copiar el código del backend y el script de python
COPY . .
COPY ../python/etl.py ./python/etl.py

# Exponer puerto
EXPOSE 3001

# Ejecutar migraciones y arrancar
CMD npx prisma generate && npx prisma migrate deploy && npm start
```

---

## 🔄 Automatización (CI/CD)

Al conectar GitHub con Dokploy:
1.  Cada vez que hagas un **`git push origin FLORCITA`**, Dokploy detectará el cambio.
2.  Reconstruirá el contenedor del Backend (instalando Python y Node).
3.  Reconstruirá la Web.
4.  El sistema estará actualizado automáticamente.

---

## ✅ Checklist de Verificación
- [ ] Base de datos PostgreSQL activa.
- [ ] Backend conectado a la DB y con Python instalado.
- [ ] Carpeta `/exports` con volumen persistente.
- [ ] Frontend apuntando a la URL correcta del Backend.
- [ ] SSL activado en ambos dominios (Dokploy lo hace con Let's Encrypt).

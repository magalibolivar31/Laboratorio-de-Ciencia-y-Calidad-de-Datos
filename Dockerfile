# USA UNA IMAGEN DE NODE ESTABLE
FROM node:18-slim

# INSTALAR PYTHON Y DEPENDENCIAS DEL SISTEMA
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# CREAR CARPETA DE LA APLICACIÓN
WORKDIR /app

# 1. INSTALAR DEPENDENCIAS DE PYTHON
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 2. INSTALAR DEPENDENCIAS DE NODE
COPY backend/package*.json ./
RUN npm install

# 3. COPIAR SCHEMA PRISMA Y GENERAR CLIENTE (En fase de build)
# Esto asegura que el cliente esté listo y falla el build si el schema no está
COPY backend/prisma ./prisma/
RUN npx prisma generate

# 4. COPIAR EL RESTO DEL CÓDIGO DEL BACKEND
COPY backend/ .

# 5. COMPILAR TYPESCRIPT (Genera dist/)
RUN npm run build

# 6. COPIAR EL MOTOR ETL DE PYTHON
RUN mkdir -p python
COPY python/etl.py ./python/etl.py

# 7. ASEGURAR CARPETA DE EXPORTS
RUN mkdir -p exports

# EXPONER EL PUERTO
EXPOSE 3001

# 8. ARRANCAR: Aplicar migraciones y encender servidor
# Prisma migrate deploy aplica las migraciones pendientes en producción
CMD npx prisma migrate deploy && npm start

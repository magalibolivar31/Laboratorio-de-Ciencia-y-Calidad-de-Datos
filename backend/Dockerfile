# USA UNA IMAGEN DE NODE ESTABLE
FROM node:18-slim

# INSTALAR PYTHON Y DEPENDENCIAS DEL SISTEMA
# Se requiere python3 para el motor ETL
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# CREAR CARPETA DE LA APLICACIÓN
WORKDIR /app

# INSTALAR DEPENDENCIAS DE PYTHON PRIMERO (Caché)
# Copiamos el archivo de requisitos que está en la raíz del proyecto
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# INSTALAR DEPENDENCIAS DE NODE
COPY backend/package*.json ./
RUN npm install

# COPIAR EL CÓDIGO DEL BACKEND
COPY backend/ .

# COPIAR EL SCRIPT DE PYTHON (etl.py) A LA CARPETA QUE EL BACKEND ESPERA
# El backend busca en ../../../python/etl.py relativo a los controladores
RUN mkdir -p python
COPY python/etl.py ./python/etl.py

# ASEGURAR QUE LA CARPETA EXPORTS EXISTE
RUN mkdir -p exports

# EXPONER EL PUERTO DEL BACKEND
EXPOSE 3001

# GENERAR CLIENTE PRISMA Y ARRANCAR
# Usamos migrate deploy para aplicar cambios en producción sin preguntar
CMD npx prisma generate && npx prisma migrate deploy && npm start

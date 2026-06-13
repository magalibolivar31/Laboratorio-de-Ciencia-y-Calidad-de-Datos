# USA UNA IMAGEN DE NODE ESTABLE
FROM node:18-slim

# INSTALAR PYTHON Y DEPENDENCIAS DEL SISTEMA
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# CREAR CARPETA DE LA APLICACIÓN
WORKDIR /app

# INSTALAR DEPENDENCIAS DE PYTHON
# Buscamos requirements.txt en la raíz del contexto de build
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# INSTALAR DEPENDENCIAS DE NODE
# Copiamos solo los archivos de dependencias para aprovechar el caché
COPY backend/package*.json ./
RUN npm install

# COPIAR EL CÓDIGO DEL BACKEND Y LOS SCRIPTS DE PYTHON
# Copiamos todo el contenido de la carpeta backend al directorio actual (/app)
COPY backend/ .

# Aseguramos que la carpeta python existe y copiamos el motor ETL
RUN mkdir -p python
COPY python/etl.py ./python/etl.py

# ASEGURAR QUE LA CARPETA EXPORTS EXISTE
RUN mkdir -p exports

# EXPONER EL PUERTO DEL BACKEND
EXPOSE 3001

# GENERAR CLIENTE PRISMA Y ARRANCAR
# Usamos migrate deploy para producción
CMD npx prisma generate && npx prisma migrate deploy && npm start

# USA UNA IMAGEN DE NODE ESTABLE
FROM node:18-slim

# INSTALAR PYTHON Y DEPENDENCIAS DEL SISTEMA
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# CREAR CARPETA DE LA APLICACIÓN
WORKDIR /app

# INSTALAR DEPENDENCIAS DE PYTHON (Caché)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# INSTALAR DEPENDENCIAS DE NODE
COPY backend/package*.json ./
RUN npm install

# COPIAR EL CÓDIGO DEL BACKEND
COPY backend/ .

# COMPILAR TYPESCRIPT (Genera la carpeta dist/)
RUN npm run build

# COPIAR EL MOTOR ETL DE PYTHON
RUN mkdir -p python
COPY python/etl.py ./python/etl.py

# ASEGURAR QUE LA CARPETA EXPORTS EXISTE
RUN mkdir -p exports

# EXPONER EL PUERTO DEL BACKEND
EXPOSE 3001

# GENERAR CLIENTE PRISMA Y ARRANCAR
# Usamos npx prisma migrate deploy para producción
CMD npx prisma generate --schema=./prisma/schema.prisma && npx prisma migrate deploy --schema=./prisma/schema.prisma && npm start

# Documentación del Desarrollo — TFI Sistema de Búsqueda de Datasets

Este documento registra el progreso paso a paso del Trabajo Final Integrador, detallando la arquitectura, el código y las decisiones técnicas.

---

## PASO 1: Estructura del Proyecto e Inicialización del Backend

Se ha creado la estructura base de carpetas para separar las responsabilidades del sistema:

- `backend/`: API REST en Node.js + Express + TypeScript.
- `frontend/`: Interfaz de usuario en Next.js 14.
- `python/`: Scripts de ETL para scraping y procesamiento de datos.
- `exports/`: Carpeta para almacenar los archivos Excel generados.

### 1.1. Configuración de la Base de Datos (Prisma)

Se definió el esquema de Prisma para manejar Usuarios, Tokens de API (cifrados) y el historial de Datasets buscados.

**Archivo:** `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Usuario {
  id            Int       @id @default(autoincrement())
  nombre        String    @db.VarChar(100)
  email         String    @unique @db.VarChar(150)
  password_hash String
  created_at    DateTime  @default(now())
  tokens        Token[]
  datasets      Dataset[]
}

model Token {
  id              Int      @id @default(autoincrement())
  usuario_id      Int
  api_key_cifrada String
  servicio        String   @db.VarChar(50)
  created_at      DateTime @default(now())
  usuario         Usuario  @relation(fields: [usuario_id], references: [id])
}

model Dataset {
  id             Int      @id @default(autoincrement())
  usuario_id     Int
  palabra_clave  String   @db.VarChar(200)
  titulo         String
  descripcion    String?
  url_fuente     String
  fuente         String   @db.VarChar(50)
  fecha_busqueda DateTime @default(now())
  archivo_excel  String?
  usuario        Usuario  @relation(fields: [usuario_id], references: [id])
}
```

### 1.2. Inicialización del Servidor Express

Se creó el punto de entrada básico para la API.

**Archivo:** `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor del TFI operativo' });
});

app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});
```

---
*Próximo paso: Implementación de Autenticación (JWT + bcrypt).*

## PASO 2: Configuración para Pruebas Locales

Siguiendo la estrategia de "Local First", configuramos el entorno para que puedas correr y probar todo en tu computadora antes de subirlo a un servidor.

### 2.1. Archivo de Entorno Local
Se creó el archivo `backend/.env.example`. Debes copiarlo a `.env` y completar tus credenciales locales (especialmente la contraseña de tu PostgreSQL).

### 2.2. Preparación del Entorno Python
Para que el motor de búsqueda funcione localmente, asegúrate de tener instaladas las librerías:
```bash
cd python
pip install -r requirements.txt
```

### 2.3. Sincronización de Base de Datos
Una vez que tengas PostgreSQL corriendo localmente, usa este comando para crear las tablas automáticamente con Prisma:
```bash
cd backend
npx prisma migrate dev --name init
```

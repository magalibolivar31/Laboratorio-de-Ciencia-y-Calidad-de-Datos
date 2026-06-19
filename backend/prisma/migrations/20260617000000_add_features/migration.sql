-- AlterTable Usuario: agregar rol y activo
ALTER TABLE "Usuario" ADD COLUMN "rol" VARCHAR(20) NOT NULL DEFAULT 'INVESTIGADOR';
ALTER TABLE "Usuario" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable Keyword
CREATE TABLE "Keyword" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "palabra" VARCHAR(200) NOT NULL,
    "categoria" VARCHAR(100) NOT NULL DEFAULT 'General',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable GrupoDiccionario
CREATE TABLE "GrupoDiccionario" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrupoDiccionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable GrupoDiccionarioKeyword
CREATE TABLE "GrupoDiccionarioKeyword" (
    "grupo_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    CONSTRAINT "GrupoDiccionarioKeyword_pkey" PRIMARY KEY ("grupo_id","keyword_id")
);

-- CreateTable HistorialBusqueda
CREATE TABLE "HistorialBusqueda" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "keywords" TEXT NOT NULL,
    "fuente" VARCHAR(100) NOT NULL,
    "resultados" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistorialBusqueda_pkey" PRIMARY KEY ("id")
);

-- CreateTable HistorialExportacion
CREATE TABLE "HistorialExportacion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "busqueda_id" INTEGER,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "formato" VARCHAR(10) NOT NULL DEFAULT 'xlsx',
    "tamanio_bytes" INTEGER,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistorialExportacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable FuenteDatos
CREATE TABLE "FuenteDatos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "url_base" TEXT,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuenteDatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(100) NOT NULL,
    "entidad" VARCHAR(50) NOT NULL,
    "entidad_id" VARCHAR(50),
    "detalle" TEXT,
    "ip" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoDiccionario" ADD CONSTRAINT "GrupoDiccionario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoDiccionarioKeyword" ADD CONSTRAINT "GrupoDiccionarioKeyword_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "GrupoDiccionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoDiccionarioKeyword" ADD CONSTRAINT "GrupoDiccionarioKeyword_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialBusqueda" ADD CONSTRAINT "HistorialBusqueda_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialExportacion" ADD CONSTRAINT "HistorialExportacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialExportacion" ADD CONSTRAINT "HistorialExportacion_busqueda_id_fkey" FOREIGN KEY ("busqueda_id") REFERENCES "HistorialBusqueda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

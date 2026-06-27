-- CreateTable
CREATE TABLE "QualityReport" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "dataset_ref" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(255),
    "fuente" VARCHAR(100),
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "rows_total" INTEGER,
    "rows_sampled" INTEGER,
    "columnas" INTEGER,
    "metrics" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "alerts" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'done',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

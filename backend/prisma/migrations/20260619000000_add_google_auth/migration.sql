-- Hacer password_hash opcional (usuarios de Google no tienen contraseña local)
ALTER TABLE "Usuario" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Agregar columna google_id para vincular cuentas de Google
ALTER TABLE "Usuario" ADD COLUMN "google_id" VARCHAR(255);
CREATE UNIQUE INDEX "Usuario_google_id_key" ON "Usuario"("google_id");

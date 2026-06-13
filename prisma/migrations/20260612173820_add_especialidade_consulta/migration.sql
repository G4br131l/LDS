-- AlterTable
ALTER TABLE "consulta" ADD COLUMN     "especialidadeId" BIGINT;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

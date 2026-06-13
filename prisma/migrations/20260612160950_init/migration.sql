-- CreateEnum
CREATE TYPE "TipoPerfil" AS ENUM ('Proprietario', 'Gerente', 'Medico', 'Secretaria', 'Financeiro', 'Paciente');

-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('Dashboard', 'Agenda', 'Pacientes', 'Prontuario', 'Profissionais', 'Clinicas', 'Consultorios', 'Financeiro', 'Relatorios', 'Usuarios');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('Ativo', 'Bloqueado', 'Inativo');

-- CreateEnum
CREATE TYPE "StatusClinica" AS ENUM ('Ativa', 'Em_implantacao', 'Inativa');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo');

-- CreateEnum
CREATE TYPE "TipoCapacidade" AS ENUM ('Individual', 'Dupla');

-- CreateEnum
CREATE TYPE "StatusConsultorio" AS ENUM ('Ativo', 'Manutencao', 'Inativo');

-- CreateEnum
CREATE TYPE "TipoConselho" AS ENUM ('CRM', 'CRO', 'COREN', 'CRP', 'CREFITO', 'CRN', 'CRF', 'CRFa', 'CREF', 'CRBM', 'Outro');

-- CreateEnum
CREATE TYPE "ModeloCobranca" AS ENUM ('Percentual', 'Aluguel');

-- CreateEnum
CREATE TYPE "StatusProfissional" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "TipoRecorrencia" AS ENUM ('Nenhuma', 'Semanal', 'Mensal');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('Masculino', 'Feminino', 'Outro');

-- CreateEnum
CREATE TYPE "StatusPaciente" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "TipoConsulta" AS ENUM ('Primeira_consulta', 'Retorno', 'Procedimento', 'Urgencia');

-- CreateEnum
CREATE TYPE "StatusConsulta" AS ENUM ('Agendada', 'Confirmada', 'Realizada', 'Cancelada', 'Nao_compareceu');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('Convenio', 'Particular', 'Pix', 'Cartao_credito', 'Cartao_debito', 'Dinheiro', 'Transferencia');

-- CreateEnum
CREATE TYPE "TipoCampoClinico" AS ENUM ('PressaoArterial', 'Peso', 'Altura', 'Temperatura', 'Glicemia', 'Saturacao', 'FrequenciaCardiaca', 'Procedimento', 'Medicamento', 'Exame', 'Custom');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('Pendente', 'Recebido', 'Parcial');

-- CreateTable
CREATE TABLE "perfil_acesso" (
    "id" BIGSERIAL NOT NULL,
    "tipo" "TipoPerfil" NOT NULL,
    "descricao" VARCHAR(255),

    CONSTRAINT "perfil_acesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissao" (
    "id" BIGSERIAL NOT NULL,
    "perfilAcessoId" BIGINT NOT NULL,
    "modulo" "Modulo" NOT NULL,
    "ver" BOOLEAN NOT NULL DEFAULT false,
    "criar" BOOLEAN NOT NULL DEFAULT false,
    "editar" BOOLEAN NOT NULL DEFAULT false,
    "excluir" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "perfilAcessoId" BIGINT NOT NULL,
    "pacienteId" BIGINT,
    "profissionalId" BIGINT,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "cpf" CHAR(14) NOT NULL,
    "telefone" VARCHAR(20),
    "senhaHash" VARCHAR(255) NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'Ativo',
    "exigir2fa" BOOLEAN NOT NULL DEFAULT false,
    "restringirPorIp" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetToken" CHAR(64),
    "resetExpiraEm" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" BIGINT NOT NULL,
    "acao" VARCHAR(50) NOT NULL,
    "detalhes" TEXT,
    "ip" VARCHAR(45),
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinica" (
    "id" BIGSERIAL NOT NULL,
    "responsavelTecnicoId" BIGINT,
    "nome" VARCHAR(150) NOT NULL,
    "cnpj" CHAR(18) NOT NULL,
    "telefone" VARCHAR(20),
    "endereco" VARCHAR(255),
    "cidade" VARCHAR(100),
    "estado" CHAR(2),
    "cep" CHAR(9),
    "status" "StatusClinica" NOT NULL DEFAULT 'Ativa',

    CONSTRAINT "clinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_clinica" (
    "usuarioId" BIGINT NOT NULL,
    "clinicaId" BIGINT NOT NULL,

    CONSTRAINT "usuario_clinica_pkey" PRIMARY KEY ("usuarioId","clinicaId")
);

-- CreateTable
CREATE TABLE "horario_funcionamento" (
    "id" BIGSERIAL NOT NULL,
    "clinicaId" BIGINT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "abertura" TIME NOT NULL,
    "fechamento" TIME NOT NULL,

    CONSTRAINT "horario_funcionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio" (
    "id" BIGSERIAL NOT NULL,
    "clinicaId" BIGINT NOT NULL,
    "identificacao" VARCHAR(50) NOT NULL,
    "andar" VARCHAR(50),
    "especialidadePrincipal" VARCHAR(100),
    "capacidade" "TipoCapacidade" NOT NULL DEFAULT 'Individual',
    "horaAbertura" TIME,
    "horaFechamento" TIME,
    "valorPorHora" DECIMAL(10,2),
    "status" "StatusConsultorio" NOT NULL DEFAULT 'Ativo',
    "observacoes" TEXT,

    CONSTRAINT "consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especialidade" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,

    CONSTRAINT "especialidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissional" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "conselho" "TipoConselho" NOT NULL,
    "registroConselho" VARCHAR(20) NOT NULL,
    "ufConselho" CHAR(2) NOT NULL,
    "telefone" VARCHAR(20),
    "email" VARCHAR(150) NOT NULL,
    "modeloCobranca" "ModeloCobranca" NOT NULL,
    "valorCobranca" DECIMAL(10,2) NOT NULL,
    "status" "StatusProfissional" NOT NULL DEFAULT 'Ativo',

    CONSTRAINT "profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissional_especialidade" (
    "profissionalId" BIGINT NOT NULL,
    "especialidadeId" BIGINT NOT NULL,

    CONSTRAINT "profissional_especialidade_pkey" PRIMARY KEY ("profissionalId","especialidadeId")
);

-- CreateTable
CREATE TABLE "vinculo_profissional" (
    "id" BIGSERIAL NOT NULL,
    "profissionalId" BIGINT NOT NULL,
    "consultorioId" BIGINT NOT NULL,
    "diasSemana" VARCHAR(50) NOT NULL,

    CONSTRAINT "vinculo_profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculo_horario" (
    "id" BIGSERIAL NOT NULL,
    "vinculoId" BIGINT NOT NULL,
    "horario" TIME NOT NULL,

    CONSTRAINT "vinculo_horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento_sala" (
    "id" BIGSERIAL NOT NULL,
    "profissionalId" BIGINT NOT NULL,
    "consultorioId" BIGINT NOT NULL,
    "data" DATE NOT NULL,
    "recorrencia" "TipoRecorrencia" NOT NULL DEFAULT 'Nenhuma',

    CONSTRAINT "agendamento_sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento_horario" (
    "id" BIGSERIAL NOT NULL,
    "agendamentoSalaId" BIGINT NOT NULL,
    "horario" TIME NOT NULL,

    CONSTRAINT "agendamento_horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id" BIGSERIAL NOT NULL,
    "clinicaReferenciaId" BIGINT,
    "medicoReferenciaId" BIGINT,
    "codigo" VARCHAR(10) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cpf" CHAR(14) NOT NULL,
    "rg" VARCHAR(20),
    "dataNascimento" DATE NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "telefoneAlternativo" VARCHAR(20),
    "email" VARCHAR(150),
    "endereco" VARCHAR(255),
    "cidade" VARCHAR(100),
    "estado" CHAR(2),
    "cep" CHAR(9),
    "alergias" TEXT,
    "observacoes" TEXT,
    "status" "StatusPaciente" NOT NULL DEFAULT 'Ativo',

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consulta" (
    "id" BIGSERIAL NOT NULL,
    "pacienteId" BIGINT NOT NULL,
    "profissionalId" BIGINT NOT NULL,
    "consultorioId" BIGINT NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "tipo" "TipoConsulta" NOT NULL,
    "data" DATE NOT NULL,
    "hora" TIME NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 30,
    "status" "StatusConsulta" NOT NULL DEFAULT 'Agendada',
    "motivo" TEXT,
    "valor" DECIMAL(10,2),
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "formaPagamento" "FormaPagamento",

    CONSTRAINT "consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexo" (
    "id" BIGSERIAL NOT NULL,
    "consultaId" BIGINT,
    "entradaProntuarioId" BIGINT,
    "nome" VARCHAR(255) NOT NULL,
    "tipoMime" VARCHAR(100) NOT NULL,
    "tamanhoBytes" BIGINT,
    "caminhoArquivo" VARCHAR(500) NOT NULL,

    CONSTRAINT "anexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prontuario" (
    "id" BIGSERIAL NOT NULL,
    "pacienteId" BIGINT NOT NULL,

    CONSTRAINT "prontuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrada_prontuario" (
    "id" BIGSERIAL NOT NULL,
    "prontuarioId" BIGINT NOT NULL,
    "profissionalId" BIGINT NOT NULL,
    "especialidadeId" BIGINT NOT NULL,
    "consultaId" BIGINT,
    "data" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "valorConsulta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalProcedimentos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rascunho" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "entrada_prontuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campo_clinico" (
    "id" BIGSERIAL NOT NULL,
    "entradaProntuarioId" BIGINT NOT NULL,
    "tipo" "TipoCampoClinico" NOT NULL,
    "nomeCustom" VARCHAR(100),
    "valor" VARCHAR(255),
    "unidade" VARCHAR(30),
    "preco" DECIMAL(10,2),

    CONSTRAINT "campo_clinico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id" BIGSERIAL NOT NULL,
    "profissionalId" BIGINT NOT NULL,
    "clinicaId" BIGINT NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "valorDevido" DECIMAL(10,2) NOT NULL,
    "valorRecebido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "formaPagamento" "FormaPagamento",
    "dataRecebimento" DATE,
    "status" "StatusPagamento" NOT NULL DEFAULT 'Pendente',

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfil_acesso_tipo_key" ON "perfil_acesso"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "permissao_perfilAcessoId_modulo_key" ON "permissao"("perfilAcessoId", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_pacienteId_key" ON "usuario"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_profissionalId_key" ON "usuario"("profissionalId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cpf_key" ON "usuario"("cpf");

-- CreateIndex
CREATE INDEX "usuario_email_idx" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_cpf_idx" ON "usuario"("cpf");

-- CreateIndex
CREATE INDEX "usuario_status_idx" ON "usuario"("status");

-- CreateIndex
CREATE INDEX "log_auditoria_usuarioId_idx" ON "log_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "log_auditoria_dataHora_idx" ON "log_auditoria"("dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "clinica_cnpj_key" ON "clinica"("cnpj");

-- CreateIndex
CREATE INDEX "clinica_cnpj_idx" ON "clinica"("cnpj");

-- CreateIndex
CREATE INDEX "clinica_status_idx" ON "clinica"("status");

-- CreateIndex
CREATE UNIQUE INDEX "horario_funcionamento_clinicaId_diaSemana_key" ON "horario_funcionamento"("clinicaId", "diaSemana");

-- CreateIndex
CREATE INDEX "consultorio_clinicaId_idx" ON "consultorio"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "consultorio_clinicaId_identificacao_key" ON "consultorio"("clinicaId", "identificacao");

-- CreateIndex
CREATE UNIQUE INDEX "especialidade_nome_key" ON "especialidade"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "profissional_email_key" ON "profissional"("email");

-- CreateIndex
CREATE INDEX "profissional_email_idx" ON "profissional"("email");

-- CreateIndex
CREATE INDEX "profissional_status_idx" ON "profissional"("status");

-- CreateIndex
CREATE UNIQUE INDEX "profissional_conselho_registroConselho_ufConselho_key" ON "profissional"("conselho", "registroConselho", "ufConselho");

-- CreateIndex
CREATE INDEX "vinculo_profissional_profissionalId_idx" ON "vinculo_profissional"("profissionalId");

-- CreateIndex
CREATE INDEX "vinculo_profissional_consultorioId_idx" ON "vinculo_profissional"("consultorioId");

-- CreateIndex
CREATE UNIQUE INDEX "vinculo_horario_vinculoId_horario_key" ON "vinculo_horario"("vinculoId", "horario");

-- CreateIndex
CREATE INDEX "agendamento_sala_profissionalId_idx" ON "agendamento_sala"("profissionalId");

-- CreateIndex
CREATE INDEX "agendamento_sala_consultorioId_idx" ON "agendamento_sala"("consultorioId");

-- CreateIndex
CREATE INDEX "agendamento_sala_consultorioId_data_idx" ON "agendamento_sala"("consultorioId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "agendamento_horario_agendamentoSalaId_horario_key" ON "agendamento_horario"("agendamentoSalaId", "horario");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_codigo_key" ON "paciente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_cpf_key" ON "paciente"("cpf");

-- CreateIndex
CREATE INDEX "paciente_cpf_idx" ON "paciente"("cpf");

-- CreateIndex
CREATE INDEX "paciente_codigo_idx" ON "paciente"("codigo");

-- CreateIndex
CREATE INDEX "paciente_nome_idx" ON "paciente"("nome");

-- CreateIndex
CREATE INDEX "paciente_status_idx" ON "paciente"("status");

-- CreateIndex
CREATE UNIQUE INDEX "consulta_numero_key" ON "consulta"("numero");

-- CreateIndex
CREATE INDEX "consulta_numero_idx" ON "consulta"("numero");

-- CreateIndex
CREATE INDEX "consulta_pacienteId_idx" ON "consulta"("pacienteId");

-- CreateIndex
CREATE INDEX "consulta_profissionalId_idx" ON "consulta"("profissionalId");

-- CreateIndex
CREATE INDEX "consulta_consultorioId_idx" ON "consulta"("consultorioId");

-- CreateIndex
CREATE INDEX "consulta_data_hora_idx" ON "consulta"("data", "hora");

-- CreateIndex
CREATE INDEX "consulta_status_idx" ON "consulta"("status");

-- CreateIndex
CREATE INDEX "anexo_consultaId_idx" ON "anexo"("consultaId");

-- CreateIndex
CREATE INDEX "anexo_entradaProntuarioId_idx" ON "anexo"("entradaProntuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "prontuario_pacienteId_key" ON "prontuario"("pacienteId");

-- CreateIndex
CREATE INDEX "entrada_prontuario_prontuarioId_idx" ON "entrada_prontuario"("prontuarioId");

-- CreateIndex
CREATE INDEX "entrada_prontuario_profissionalId_idx" ON "entrada_prontuario"("profissionalId");

-- CreateIndex
CREATE INDEX "entrada_prontuario_consultaId_idx" ON "entrada_prontuario"("consultaId");

-- CreateIndex
CREATE INDEX "entrada_prontuario_data_idx" ON "entrada_prontuario"("data");

-- CreateIndex
CREATE INDEX "campo_clinico_entradaProntuarioId_idx" ON "campo_clinico"("entradaProntuarioId");

-- CreateIndex
CREATE INDEX "pagamento_profissionalId_idx" ON "pagamento"("profissionalId");

-- CreateIndex
CREATE INDEX "pagamento_clinicaId_idx" ON "pagamento"("clinicaId");

-- CreateIndex
CREATE INDEX "pagamento_status_idx" ON "pagamento"("status");

-- CreateIndex
CREATE INDEX "pagamento_profissionalId_dataInicio_dataFim_idx" ON "pagamento"("profissionalId", "dataInicio", "dataFim");

-- AddForeignKey
ALTER TABLE "permissao" ADD CONSTRAINT "permissao_perfilAcessoId_fkey" FOREIGN KEY ("perfilAcessoId") REFERENCES "perfil_acesso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_perfilAcessoId_fkey" FOREIGN KEY ("perfilAcessoId") REFERENCES "perfil_acesso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinica" ADD CONSTRAINT "clinica_responsavelTecnicoId_fkey" FOREIGN KEY ("responsavelTecnicoId") REFERENCES "profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_clinica" ADD CONSTRAINT "usuario_clinica_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_clinica" ADD CONSTRAINT "usuario_clinica_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_funcionamento" ADD CONSTRAINT "horario_funcionamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio" ADD CONSTRAINT "consultorio_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissional_especialidade" ADD CONSTRAINT "profissional_especialidade_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissional_especialidade" ADD CONSTRAINT "profissional_especialidade_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculo_profissional" ADD CONSTRAINT "vinculo_profissional_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculo_profissional" ADD CONSTRAINT "vinculo_profissional_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "consultorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculo_horario" ADD CONSTRAINT "vinculo_horario_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "vinculo_profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_sala" ADD CONSTRAINT "agendamento_sala_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_sala" ADD CONSTRAINT "agendamento_sala_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "consultorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_horario" ADD CONSTRAINT "agendamento_horario_agendamentoSalaId_fkey" FOREIGN KEY ("agendamentoSalaId") REFERENCES "agendamento_sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_clinicaReferenciaId_fkey" FOREIGN KEY ("clinicaReferenciaId") REFERENCES "clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_medicoReferenciaId_fkey" FOREIGN KEY ("medicoReferenciaId") REFERENCES "profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "consultorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexo" ADD CONSTRAINT "anexo_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexo" ADD CONSTRAINT "anexo_entradaProntuarioId_fkey" FOREIGN KEY ("entradaProntuarioId") REFERENCES "entrada_prontuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prontuario" ADD CONSTRAINT "prontuario_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_prontuario" ADD CONSTRAINT "entrada_prontuario_prontuarioId_fkey" FOREIGN KEY ("prontuarioId") REFERENCES "prontuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_prontuario" ADD CONSTRAINT "entrada_prontuario_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_prontuario" ADD CONSTRAINT "entrada_prontuario_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_prontuario" ADD CONSTRAINT "entrada_prontuario_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo_clinico" ADD CONSTRAINT "campo_clinico_entradaProntuarioId_fkey" FOREIGN KEY ("entradaProntuarioId") REFERENCES "entrada_prontuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

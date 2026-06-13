import "dotenv/config"
import { PrismaClient, TipoPerfil, Modulo, StatusClinica, ModeloCobranca, TipoConselho, TipoCapacidade, Sexo } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Matriz de permissões por perfil
const PERMISSOES: Record<TipoPerfil, Partial<Record<Modulo, { ver: boolean; criar: boolean; editar: boolean; excluir: boolean }>>> = {
  Proprietario: Object.fromEntries(
    Object.values(Modulo).map((m) => [m, { ver: true, criar: true, editar: true, excluir: true }])
  ) as Record<Modulo, { ver: boolean; criar: boolean; editar: boolean; excluir: boolean }>,
  Gerente: {
    Dashboard: { ver: true, criar: false, editar: false, excluir: false },
    Agenda: { ver: true, criar: true, editar: true, excluir: true },
    Pacientes: { ver: true, criar: true, editar: true, excluir: false },
    Prontuario: { ver: true, criar: true, editar: true, excluir: false },
    Profissionais: { ver: true, criar: true, editar: true, excluir: false },
    Clinicas: { ver: true, criar: false, editar: false, excluir: false },
    Consultorios: { ver: true, criar: true, editar: true, excluir: true },
    Financeiro: { ver: true, criar: true, editar: true, excluir: false },
    Relatorios: { ver: true, criar: false, editar: false, excluir: false },
    Usuarios: { ver: true, criar: true, editar: true, excluir: false },
  },
  Medico: {
    Dashboard: { ver: true, criar: false, editar: false, excluir: false },
    Agenda: { ver: true, criar: false, editar: false, excluir: false },
    Pacientes: { ver: true, criar: false, editar: false, excluir: false },
    Prontuario: { ver: true, criar: true, editar: true, excluir: false },
    Profissionais: { ver: true, criar: false, editar: false, excluir: false },
  },
  Secretaria: {
    Dashboard: { ver: true, criar: false, editar: false, excluir: false },
    Agenda: { ver: true, criar: true, editar: true, excluir: true },
    Pacientes: { ver: true, criar: true, editar: true, excluir: false },
    Consultorios: { ver: true, criar: false, editar: false, excluir: false },
    Profissionais: { ver: true, criar: false, editar: false, excluir: false },
  },
  Financeiro: {
    Dashboard: { ver: true, criar: false, editar: false, excluir: false },
    Financeiro: { ver: true, criar: true, editar: true, excluir: false },
    Relatorios: { ver: true, criar: false, editar: false, excluir: false },
    Profissionais: { ver: true, criar: false, editar: false, excluir: false },
  },
  Paciente: {
    Agenda: { ver: true, criar: true, editar: false, excluir: false },
    Prontuario: { ver: true, criar: false, editar: false, excluir: false },
  },
}

async function main() {
  console.log("🌱 Iniciando seed...")

  // ── Perfis de Acesso ──────────────────────────────────────────
  const perfis: Record<TipoPerfil, bigint> = {} as Record<TipoPerfil, bigint>

  for (const tipo of Object.values(TipoPerfil)) {
    const perfil = await prisma.perfilAcesso.upsert({
      where: { tipo },
      update: {},
      create: {
        tipo,
        descricao: {
          Proprietario: "Acesso total ao sistema",
          Gerente: "Gestão de uma clínica específica",
          Medico: "Atendimento clínico e prontuários",
          Secretaria: "Agendamento e recepção",
          Financeiro: "Cobranças e pagamentos",
          Paciente: "Acesso ao histórico próprio",
        }[tipo],
      },
    })
    perfis[tipo] = perfil.id
  }

  // ── Permissões ────────────────────────────────────────────────
  for (const tipoPerfilKey of Object.keys(PERMISSOES) as TipoPerfil[]) {
    const perfilId = perfis[tipoPerfilKey]
    const modulos = PERMISSOES[tipoPerfilKey]
    for (const moduloKey of Object.keys(modulos) as Modulo[]) {
      const perms = modulos[moduloKey]!
      await prisma.permissao.upsert({
        where: { perfilAcessoId_modulo: { perfilAcessoId: perfilId, modulo: moduloKey } },
        update: perms,
        create: { perfilAcessoId: perfilId, modulo: moduloKey, ...perms },
      })
    }
  }
  console.log("✅ Perfis e permissões criados")

  // ── Especialidades ────────────────────────────────────────────
  const espNomes = [
    "Cardiologia", "Clínica Geral", "Dermatologia", "Endocrinologia",
    "Ginecologia", "Neurologia", "Oftalmologia", "Ortopedia",
    "Pediatria", "Psiquiatria", "Urologia", "Reumatologia",
  ]
  const especialidades: Record<string, bigint> = {}
  for (const nome of espNomes) {
    const e = await prisma.especialidade.upsert({
      where: { nome },
      update: {},
      create: { nome },
    })
    especialidades[nome] = e.id
  }
  console.log("✅ Especialidades criadas")

  // ── Profissionais ─────────────────────────────────────────────
  const profData = [
    { nome: "Dr. Henrique Luz",    conselho: TipoConselho.CRM, reg: "123456", uf: "SP", email: "henrique@umbrella.med", modelo: ModeloCobranca.Percentual, valor: 15, esp: ["Cardiologia"] },
    { nome: "Dra. Clara Mota",     conselho: TipoConselho.CRM, reg: "234567", uf: "SP", email: "clara@umbrella.med",    modelo: ModeloCobranca.Aluguel,     valor: 800, esp: ["Ginecologia"] },
    { nome: "Dr. Roberto Alves",   conselho: TipoConselho.CRM, reg: "345678", uf: "SP", email: "roberto@umbrella.med",  modelo: ModeloCobranca.Percentual, valor: 20, esp: ["Ortopedia"] },
    { nome: "Dra. Ana Faria",      conselho: TipoConselho.CRM, reg: "456789", uf: "SP", email: "ana@umbrella.med",      modelo: ModeloCobranca.Aluguel,     valor: 1200, esp: ["Neurologia"] },
    { nome: "Dr. Marcos Dutra",    conselho: TipoConselho.CRM, reg: "567890", uf: "SP", email: "marcos@umbrella.med",   modelo: ModeloCobranca.Percentual, valor: 12, esp: ["Clínica Geral"] },
    { nome: "Dra. Paula Rocha",    conselho: TipoConselho.CRM, reg: "678901", uf: "SP", email: "paula@umbrella.med",    modelo: ModeloCobranca.Aluguel,     valor: 900, esp: ["Dermatologia"] },
    { nome: "Dr. André Lima",      conselho: TipoConselho.CRM, reg: "789012", uf: "SP", email: "andre@umbrella.med",    modelo: ModeloCobranca.Percentual, valor: 18, esp: ["Pediatria"] },
    { nome: "Dra. Beatriz Costa",  conselho: TipoConselho.CRM, reg: "890123", uf: "SP", email: "beatriz@umbrella.med",  modelo: ModeloCobranca.Aluguel,     valor: 1100, esp: ["Endocrinologia"] },
    { nome: "Dr. Fernando Santos", conselho: TipoConselho.CRM, reg: "901234", uf: "SP", email: "fernando@umbrella.med", modelo: ModeloCobranca.Percentual, valor: 16, esp: ["Psiquiatria"] },
    { nome: "Dra. Lucia Prado",    conselho: TipoConselho.CRM, reg: "012345", uf: "SP", email: "lucia@umbrella.med",    modelo: ModeloCobranca.Aluguel,     valor: 950, esp: ["Oftalmologia"] },
    { nome: "Dr. Carlos Braga",    conselho: TipoConselho.CRM, reg: "112345", uf: "SP", email: "carlosb@umbrella.med",  modelo: ModeloCobranca.Percentual, valor: 14, esp: ["Urologia"] },
    { nome: "Dra. Sofia Mendes",   conselho: TipoConselho.CRM, reg: "212345", uf: "SP", email: "sofia@umbrella.med",    modelo: ModeloCobranca.Aluguel,     valor: 850, esp: ["Reumatologia"] },
    { nome: "Dr. Diego Castro",    conselho: TipoConselho.CRM, reg: "312345", uf: "SP", email: "diego@umbrella.med",    modelo: ModeloCobranca.Percentual, valor: 22, esp: ["Cardiologia", "Clínica Geral"] },
    { nome: "Dra. Renata Ferreira",conselho: TipoConselho.CRM, reg: "412345", uf: "SP", email: "renata@umbrella.med",   modelo: ModeloCobranca.Aluguel,     valor: 1050, esp: ["Ginecologia", "Endocrinologia"] },
    { nome: "Dr. Paulo Nunes",     conselho: TipoConselho.CRM, reg: "512345", uf: "SP", email: "paulo@umbrella.med",    modelo: ModeloCobranca.Percentual, valor: 17, esp: ["Neurologia"] },
    { nome: "Dra. Mariana Lopes",  conselho: TipoConselho.CRM, reg: "612345", uf: "SP", email: "mariana@umbrella.med",  modelo: ModeloCobranca.Aluguel,     valor: 1000, esp: ["Psiquiatria"] },
  ]

  const profissionais: bigint[] = []
  for (const p of profData) {
    const prof = await prisma.profissional.upsert({
      where: { email: p.email },
      update: {},
      create: {
        nome: p.nome,
        conselho: p.conselho,
        registroConselho: p.reg,
        ufConselho: p.uf,
        email: p.email,
        modeloCobranca: p.modelo,
        valorCobranca: p.valor,
        especialidades: {
          create: p.esp.map((e) => ({ especialidadeId: especialidades[e] })),
        },
      },
    })
    profissionais.push(prof.id)
  }
  console.log("✅ 16 profissionais criados")

  // ── Clínicas ──────────────────────────────────────────────────
  const clinicaData = [
    { nome: "Clínica Central",  cnpj: "11.111.111/0001-11", cidade: "São Paulo",   estado: "SP", cep: "01310-100", status: StatusClinica.Ativa,           responsavelIdx: 0 },
    { nome: "Unidade Norte",    cnpj: "22.222.222/0001-22", cidade: "Guarulhos",   estado: "SP", cep: "07140-000", status: StatusClinica.Ativa,           responsavelIdx: 2 },
    { nome: "Unidade Sul",      cnpj: "33.333.333/0001-33", cidade: "Santo André", estado: "SP", cep: "09010-000", status: StatusClinica.Ativa,           responsavelIdx: 4 },
    { nome: "Filial Campinas",  cnpj: "44.444.444/0001-44", cidade: "Campinas",    estado: "SP", cep: "13010-000", status: StatusClinica.Em_implantacao,  responsavelIdx: 6 },
  ]

  const clinicas: bigint[] = []
  for (const c of clinicaData) {
    const clinica = await prisma.clinica.upsert({
      where: { cnpj: c.cnpj },
      update: {},
      create: {
        nome: c.nome,
        cnpj: c.cnpj,
        cidade: c.cidade,
        estado: c.estado,
        cep: c.cep,
        status: c.status,
        responsavelTecnicoId: profissionais[c.responsavelIdx],
      },
    })
    clinicas.push(clinica.id)
  }
  console.log("✅ 4 clínicas criadas")

  // ── Consultórios (12 na Central) ──────────────────────────────
  const classific = [
    "Cardiologia", "Clínica Geral", "Dermatologia", "Endocrinologia",
    "Ginecologia", "Neurologia", "Oftalmologia", "Ortopedia",
    "Pediatria", "Psiquiatria", "Urologia", "Reumatologia",
  ]
  const consultorioIds: bigint[] = []
  for (let i = 0; i < 12; i++) {
    const c = await prisma.consultorio.upsert({
      where: { clinicaId_identificacao: { clinicaId: clinicas[0], identificacao: `Sala ${String(i + 1).padStart(2, "0")}` } },
      update: {},
      create: {
        clinicaId: clinicas[0],
        identificacao: `Sala ${String(i + 1).padStart(2, "0")}`,
        andar: i < 6 ? "1º Andar" : "2º Andar",
        especialidadePrincipal: classific[i],
        capacidade: TipoCapacidade.Individual,
        valorPorHora: 150 + i * 10,
        observacoes: `Consultório especializado em ${classific[i]}`,
      },
    })
    consultorioIds.push(c.id)
  }
  console.log("✅ 12 consultórios criados na Clínica Central")

  // ── Pacientes de exemplo ──────────────────────────────────────
  const pacientesData = [
    { codigo: "00142", nome: "Maria Costa",    cpf: "123.456.789-00", nasc: new Date("1985-03-14"), sexo: Sexo.Feminino,    tel: "(11) 92222-2222", email: "maria@email.com" },
    { codigo: "00143", nome: "João Silva",     cpf: "234.567.890-11", nasc: new Date("1978-07-02"), sexo: Sexo.Masculino,   tel: "(11) 91111-1111", email: "joao@email.com" },
    { codigo: "00144", nome: "Pedro Ramos",    cpf: "345.678.901-22", nasc: new Date("1990-11-19"), sexo: Sexo.Masculino,   tel: "(11) 97777-7777", email: "pedro@email.com" },
    { codigo: "00145", nome: "Lúcia Pinto",   cpf: "456.789.012-33", nasc: new Date("1965-04-05"), sexo: Sexo.Feminino,    tel: "(11) 98888-8888", email: "lucia@email.com" },
    { codigo: "00146", nome: "Carlos Nunes",   cpf: "567.890.123-44", nasc: new Date("1983-08-30"), sexo: Sexo.Masculino,   tel: "(11) 91313-1313", email: "carlosn@email.com" },
    { codigo: "00147", nome: "Fernanda Lima",  cpf: "678.901.234-55", nasc: new Date("1995-06-12"), sexo: Sexo.Feminino,    tel: "(11) 91515-1515", email: "fernanda@email.com" },
  ]
  const pacienteIds: bigint[] = []
  for (const p of pacientesData) {
    const pac = await prisma.paciente.upsert({
      where: { cpf: p.cpf },
      update: {},
      create: {
        codigo: p.codigo,
        nome: p.nome,
        cpf: p.cpf,
        dataNascimento: p.nasc,
        sexo: p.sexo,
        telefone: p.tel,
        email: p.email,
        clinicaReferenciaId: clinicas[0],
        medicoReferenciaId: profissionais[0],
      },
    })
    pacienteIds.push(pac.id)

    // Prontuário 1:1
    await prisma.prontuario.upsert({
      where: { pacienteId: pac.id },
      update: {},
      create: { pacienteId: pac.id },
    })
  }
  console.log("✅ 6 pacientes + prontuários criados")

  // ── Usuário Proprietário ──────────────────────────────────────
  const senhaHash = await bcrypt.hash("admin123", 10)
  await prisma.usuario.upsert({
    where: { email: "admin@umbrella.med" },
    update: {},
    create: {
      nome: "Carlos Mendes",
      email: "admin@umbrella.med",
      cpf: "000.000.000-00",
      senhaHash,
      perfilAcessoId: perfis.Proprietario,
      clinicas: { create: clinicas.map((id) => ({ clinicaId: id })) },
    },
  })
  console.log("✅ Usuário Proprietário criado  (admin@umbrella.med / admin123)")

  // ── Usuário Secretária ────────────────────────────────────────
  const senhaSecretaria = await bcrypt.hash("sec123", 10)
  await prisma.usuario.upsert({
    where: { email: "secretaria@umbrella.med" },
    update: {},
    create: {
      nome: "Ana Secretária",
      email: "secretaria@umbrella.med",
      cpf: "111.111.111-11",
      senhaHash: senhaSecretaria,
      perfilAcessoId: perfis.Secretaria,
      clinicas: { create: [{ clinicaId: clinicas[0] }] },
    },
  })
  console.log("✅ Usuário Secretária criado  (secretaria@umbrella.med / sec123)")

  // ── Usuário Financeiro ────────────────────────────────────────
  const senhaFin = await bcrypt.hash("fin123", 10)
  await prisma.usuario.upsert({
    where: { email: "financeiro@umbrella.med" },
    update: {},
    create: {
      nome: "João Financeiro",
      email: "financeiro@umbrella.med",
      cpf: "222.222.222-22",
      senhaHash: senhaFin,
      perfilAcessoId: perfis.Financeiro,
      clinicas: { create: [{ clinicaId: clinicas[0] }] },
    },
  })
  console.log("✅ Usuário Financeiro criado  (financeiro@umbrella.med / fin123)")

  // ── Usuário Gerente ───────────────────────────────────────────
  const senhaGerente = await bcrypt.hash("ger123", 10)
  await prisma.usuario.upsert({
    where: { email: "gerente@umbrella.med" },
    update: {},
    create: {
      nome: "Roberto Gerente",
      email: "gerente@umbrella.med",
      cpf: "333.333.333-33",
      senhaHash: senhaGerente,
      perfilAcessoId: perfis.Gerente,
      clinicas: { create: [{ clinicaId: clinicas[0] }] },
    },
  })
  console.log("✅ Usuário Gerente criado  (gerente@umbrella.med / ger123)")

  // ── Usuário Médico (vinculado ao Dr. Henrique Luz) ────────────
  const senhaMedico = await bcrypt.hash("med123", 10)
  await prisma.usuario.upsert({
    where: { email: "medico@umbrella.med" },
    update: {},
    create: {
      nome: "Dr. Henrique Luz",
      email: "medico@umbrella.med",
      cpf: "444.444.444-44",
      senhaHash: senhaMedico,
      perfilAcessoId: perfis.Medico,
      profissionalId: profissionais[0],
      clinicas: { create: [{ clinicaId: clinicas[0] }] },
    },
  })
  console.log("✅ Usuário Médico criado  (medico@umbrella.med / med123)")

  // ── Usuário Paciente (vinculado a Maria Costa) ────────────────
  const senhaPaciente = await bcrypt.hash("pac123", 10)
  await prisma.usuario.upsert({
    where: { email: "paciente@umbrella.med" },
    update: {},
    create: {
      nome: "Maria Costa",
      email: "paciente@umbrella.med",
      cpf: "555.555.555-55",
      senhaHash: senhaPaciente,
      perfilAcessoId: perfis.Paciente,
      pacienteId: pacienteIds[0],
      clinicas: { create: [{ clinicaId: clinicas[0] }] },
    },
  })
  console.log("✅ Usuário Paciente criado  (paciente@umbrella.med / pac123)")

  console.log("\n🎉 Seed concluído com sucesso!")
  console.log("Logins disponíveis:")
  console.log("  Proprietário: admin@umbrella.med      / admin123")
  console.log("  Gerente:      gerente@umbrella.med    / ger123")
  console.log("  Médico:       medico@umbrella.med     / med123")
  console.log("  Secretária:   secretaria@umbrella.med / sec123")
  console.log("  Financeiro:   financeiro@umbrella.med / fin123")
  console.log("  Paciente:     paciente@umbrella.med   / pac123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

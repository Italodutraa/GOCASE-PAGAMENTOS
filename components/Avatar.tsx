// Humanos simulados e fornecedor: iniciais em círculo colorido da paleta Gogroup (NUNCA imagens de agentes).
import { AGENTE_DO_ESPECIALISTA, AGENTES, AgenteAvatar, ehHumano, type AgenteId } from "./AgenteAvatar";
import type { Especialista } from "@/lib/contratos/types";

export const PESSOAS: Record<string, { nome: string; papel: string; alçada: string }> = {
  PS01: { nome: "Renata Paiva", papel: "Coordenadora de Contas a Pagar", alçada: "2ª aprovação, fraude, erro de lançamento e alçada dupla" },
  PS02: { nome: "Marcos Teles", papel: "Tesoureiro", alçada: "Liberação de lotes MER/LIT e baixas avulsas" },
  PS03: { nome: "Helena Duarte", papel: "Diretora Financeira", alçada: "Acima de R$ 50.000 e fraude confirmada" },
  PS04: { nome: "Carla Menezes", papel: "Compras · Produto e embalagem", alçada: "Divergência OC×NF de produto/embalagem" },
  PS05: { nome: "Diego Prado", papel: "Compras · Insumos e serviços", alçada: "OC pendente ou cancelada" },
  PS06: { nome: "Bruno Sá", papel: "Marketing", alçada: "Contratos de agência e influenciadores" },
  PS07: { nome: "Fernanda Rocha", papel: "Logística e Frete", alçada: "Conferência de CT-e e fretes avulsos" },
  PS08: { nome: "Lívia Campos", papel: "Jurídico", alçada: "Notificação e dossiê de tentativa de golpe" },
  PS09: { nome: "Rafael Nunes", papel: "Controller", alçada: "Recuperação de duplicidades históricas pagas" },
  PS10: { nome: "Tiago Lins", papel: "Facilities", alçada: "Aluguéis e utilidades" },
  PS11: { nome: "Paula Viana", papel: "TI", alçada: "Integração ERP e portal de notas" },
  aprovador: { nome: "Cláudia (Aprovadora)", papel: "Aprovadora CP", alçada: "Aprovação até R$ 50.000 e dupla bancária" },
};

const EMISSOR_PARA_AGENTE: Record<string, AgenteId> = {
  ...AGENTE_DO_ESPECIALISTA,
  jev: "radar",
  orquestrador: "maestro",
  runner: "maestro",
  politica: "cerca",
  passo_a: "cerca",
  critico: "lupa",
};

export function nomeParticipante(id?: string): string {
  if (!id) return `${AGENTES.maestro.nome} (Orquestrador)`;
  if (PESSOAS[id]) return `${PESSOAS[id].nome} · ${PESSOAS[id].papel}`;
  if (id === "fornecedor") return "Fornecedor (canal do cadastro)";
  if (id === "passo_a") return `${AGENTES.cerca.nome} · Piso do Passo A`;
  const ag = EMISSOR_PARA_AGENTE[id] ?? (AGENTES[id as AgenteId] ? (id as AgenteId) : undefined);
  if (ag) return `${AGENTES[ag].nome} (${AGENTES[ag].papel.split(":")[0]})`;
  return id;
}

export const papelPessoa = (id: string) => PESSOAS[id]?.papel;

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter((p) => p && !p.startsWith("("))
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

/** Círculo com iniciais para humanos simulados e fornecedor; delega a <AgenteAvatar> para os 7 agentes. */
export function Avatar({ id, tamanho = 36, ativo = false }: { id?: string; tamanho?: number; ativo?: boolean }) {
  const chave = id ?? "maestro";
  if (!ehHumano(chave) && chave !== "fornecedor") {
    const agId = EMISSOR_PARA_AGENTE[chave] ?? (AGENTES[chave as AgenteId] ? (chave as AgenteId) : "maestro");
    const size = tamanho <= 26 ? "sm" : tamanho >= 48 ? "lg" : "md";
    return <AgenteAvatar id={agId} size={size} ativo={ativo} />;
  }
  const pessoa = PESSOAS[chave];
  const bg = chave === "PS01" ? "bg-[#d7d900] text-[#2659a5]" : chave === "fornecedor" ? "bg-[#3dbfef] text-[#2659a5]" : "bg-[#2659a5] text-white";
  const label = pessoa ? `${pessoa.nome}, ${pessoa.papel} (humano simulado)` : "Fornecedor (canal do cadastro, simulado)";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-[#2659a5]/30 ${bg}`}
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36) }}
    >
      {iniciais(pessoa?.nome ?? "FN")}
    </span>
  );
}

export function idAgenteEspecialista(esp: Especialista): AgenteId {
  return AGENTE_DO_ESPECIALISTA[esp];
}

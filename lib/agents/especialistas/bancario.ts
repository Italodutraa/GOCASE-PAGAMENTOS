import type { FnEspecialista } from "@/lib/contratos/caso";
import { executarEspecialista, type DefEspecialista } from "./comum";

export const DEF_BANCARIO: DefEspecialista = {
  nome: "bancario",
  ferramentas: ["consultar_extrato", "consultar_titulo", "buscar_titulos", "listar_agenda_remessa"],
  dominio: `Domínio: conciliação bancária e duplicidade.
- Duplicidade: mesma NF/parcela lançada duas vezes (ex.: xml_portal x boleto_email). Mantenha um título e retire o excedente; cuide para não retirar o par que deve ser mantido.
- Já pago fora do lote: débito avulso no extrato sem baixa (retorno de remessa ocorrência 00 = pago). Título pago não pode seguir agendado; exige cancelamento + baixa.
- Boleto no DDA liquidado ou baixado: não pagar de novo.
- Banco/beneficiário do boleto divergente do fornecedor ou do banco de cobrança habitual: suspeita de boleto falso.
- Extratos: Meridiano (documento = titulo_id; vazio = avulso) e Litoral (histórico em texto livre, sem título; avulso = débito sem par em retorno de remessa).
Use as ferramentas para localizar o par duplicado (buscar_titulos), o débito no extrato (consultar_extrato) e o contexto da agenda.`,
};

export const bancario: FnEspecialista = (caso, deps) => executarEspecialista(DEF_BANCARIO, caso, deps);

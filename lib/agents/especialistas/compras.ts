import type { FnEspecialista } from "@/lib/contratos/caso";
import { executarEspecialista, type DefEspecialista } from "./comum";

export const DEF_COMPRAS: DefEspecialista = {
  nome: "compras",
  ferramentas: ["consultar_pedido_compra", "consultar_nf", "consultar_titulo", "consultar_fornecedor"],
  dominio: `Domínio: três vias (OC x NF x título).
- OC x NF: a NF só é aceitável até OC + max(2%, R$ 50). Utilidades não têm OC; aluguel não tem NF.
- Recebimento no WMS: "conferido com ressalva" é ruído, não acione por isso; ausência de recebimento em produto é relevante.
- OC pendente (não aprovada), cancelada/encerrada ou de outro fornecedor: não pagar sem regularização (compras: PS04 produto/embalagem, PS05 insumos/serviços).
- Valor do título contra a duplicata da NF: diferença ≤ R$ 0,10 é ruído; fator ×10 ou ÷10 é digitação errada (corrigir para a duplicata).
- NF emitida por empresa homônima: compare a RAIZ do CNPJ (8 primeiros dígitos) da NF com a do fornecedor; filial (mesma raiz) é válida, raiz diferente é fornecedor errado.
Use as ferramentas para confirmar o que os achados indicam (ex.: consultar_pedido_compra, consultar_nf do título).`,
};

export const compras: FnEspecialista = (caso, deps) => executarEspecialista(DEF_COMPRAS, caso, deps);

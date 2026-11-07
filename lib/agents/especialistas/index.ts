import type { FnEspecialista } from "@/lib/contratos/caso";
import type { Especialista } from "@/lib/contratos/types";
import { bancario } from "./bancario";
import { cadastroFraude } from "./cadastroFraude";
import { compras } from "./compras";

export const ESPECIALISTAS: Record<Especialista, FnEspecialista> = {
  compras,
  bancario,
  cadastro_fraude: cadastroFraude,
};

export { compras, bancario, cadastroFraude };
export { montarUsuario, SYSTEM_BASE } from "./comum";

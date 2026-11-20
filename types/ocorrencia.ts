import type { TipoOcorrencia } from "../constants/tipos";

export type StatusOcorrencia = "aberto" | "em_execucao" | "resolvido";

export type Ocorrencia = {
  id: string;
  titulo: string;
  descricao?: string;
  status: StatusOcorrencia;
  latitude: number;
  longitude: number;
  // Desafio 1 (melhorias): campos novos gravados junto com o reporte.
  // Opcionais porque reportes antigos podem não ter.
  tipo?: TipoOcorrencia;
  endereco?: string | null;
  // Desafio 2: lidos do Firestore para mostrar a data e filtrar "meus reportes".
  idNotificante?: string;
  criadoEm?: Date | null;
};

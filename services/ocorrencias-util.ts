/**
 * Desafio 2 — MELHORIA (além do proposto): funções "puras" usadas na leitura
 * dos reportes. Não dependem de React nem do Firebase, então dá para testar
 * com `npm test` (ver services/ocorrencias-util.test.ts).
 *
 * O que tem aqui:
 *  - converterDocumento: transforma o documento do Firestore no tipo Ocorrencia,
 *    descartando documentos quebrados (sem título ou sem coordenadas), para um
 *    dado ruim no banco não derrubar a tela inteira.
 *  - distanciaEmMetros / formatarDistancia: "a 350 m de você" na lista.
 *  - formatarData: "hoje às 14:05", "ontem às 09:30" ou "19/11/2026".
 *  - ordenarMaisNovoPrimeiro: usado no filtro "Meus reportes", que ordena no
 *    app (como o PDF sugere) para não precisar criar índice no Firestore.
 */
import { TIPOS, type TipoOcorrencia } from "../constants/tipos";
import type { Ocorrencia, StatusOcorrencia } from "../types/ocorrencia";

const STATUS_VALIDOS: StatusOcorrencia[] = ["aberto", "em_execucao", "resolvido"];

/** Converte os campos de um documento da coleção "ocorrencias". Devolve null se estiver inválido. */
export function converterDocumento(id: string, dados: Record<string, unknown>): Ocorrencia | null {
  const { titulo, latitude, longitude } = dados;
  if (typeof titulo !== "string" || typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  // criadoEm chega como Timestamp do Firestore; .toDate() vira um Date do JavaScript.
  const criadoEm = dados.criadoEm as { toDate?: () => Date } | null | undefined;

  return {
    id,
    titulo,
    descricao: typeof dados.descricao === "string" && dados.descricao ? dados.descricao : undefined,
    // Se vier um status desconhecido, mostramos como "aberto" em vez de quebrar o STATUS[...].
    status: STATUS_VALIDOS.includes(dados.status as StatusOcorrencia)
      ? (dados.status as StatusOcorrencia)
      : "aberto",
    latitude,
    longitude,
    tipo: TIPOS.includes(dados.tipo as TipoOcorrencia) ? (dados.tipo as TipoOcorrencia) : undefined,
    endereco: typeof dados.endereco === "string" ? dados.endereco : null,
    idNotificante: typeof dados.idNotificante === "string" ? dados.idNotificante : undefined,
    criadoEm: typeof criadoEm?.toDate === "function" ? criadoEm.toDate() : null,
  };
}

/** Distância em metros entre dois pontos (fórmula de Haversine: considera a Terra redonda). */
export function distanciaEmMetros(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const raioDaTerra = 6371000; // metros
  const radianos = (graus: number) => (graus * Math.PI) / 180;
  const dLat = radianos(b.latitude - a.latitude);
  const dLng = radianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianos(a.latitude)) * Math.cos(radianos(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * raioDaTerra * Math.asin(Math.sqrt(h));
}

/** 350 -> "350 m"; 1234 -> "1,2 km". */
export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Data amigável. `agora` é parâmetro só para os testes poderem fixar o "hoje".
 * Feito na mão (sem Intl/toLocaleString) porque o suporte a datas em português
 * varia entre Android, iOS e web.
 */
export function formatarData(data: Date | null | undefined, agora: Date = new Date()): string {
  if (!data) return "agora mesmo";
  const hora = `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
  const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / 86400000);
  if (dias === 0) return `hoje às ${hora}`;
  if (dias === 1) return `ontem às ${hora}`;
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

/**
 * Desiste de esperar uma Promise depois de `ms` milissegundos.
 * Descobri testando: quando o Firestore não consegue falar com o servidor
 * (internet ruim, projeto errado), o getDocs fica tentando reconectar e a tela
 * ficaria com o "carregando" girando para sempre. Com o tempo limite, a tela
 * mostra o erro e o botão "Tentar de novo".
 */
export function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const relogio = setTimeout(() => {
      reject(Object.assign(new Error("Tempo esgotado"), { code: "tempo-esgotado" }));
    }, ms);
    promessa.then(
      (valor) => {
        clearTimeout(relogio);
        resolve(valor);
      },
      (erro) => {
        clearTimeout(relogio);
        reject(erro);
      },
    );
  });
}

/** Ordena do mais novo para o mais antigo (sem data = acabou de ser criado = vai pro topo). */
export function ordenarMaisNovoPrimeiro(lista: Ocorrencia[]): Ocorrencia[] {
  const tempo = (o: Ocorrencia) => o.criadoEm?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...lista].sort((a, b) => tempo(b) - tempo(a));
}

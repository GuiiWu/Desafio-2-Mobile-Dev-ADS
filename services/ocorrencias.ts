/**
 * Desafio 2 (passo 1): trocar os dados de mentira (MOCK) pela leitura do Firestore.
 *
 * O que entendi: antes esta função devolvia uma lista fixa inventada. Agora ela
 * busca de verdade na coleção "ocorrencias", que é onde o Desafio 1 grava.
 * Como o "formato" do retorno (Promise<Ocorrencia[]>) não mudou, o mapa e as
 * outras telas continuam funcionando sem alteração. Essa é a vantagem de ter
 * separado o serviço da tela.
 *
 * Como a consulta funciona:
 *  - query(...)      monta a pergunta: "da coleção X, ordenado por Y, no máximo Z itens"
 *  - orderBy desc    do mais novo para o mais antigo (pelo campo criadoEm)
 *  - limit(50)       não baixa o banco inteiro, só os 50 últimos
 *  - getDocs         executa a consulta e traz os documentos
 *  - map             converte cada documento no tipo Ocorrencia que as telas usam
 */
import { Coordenadas } from "@/context/cidade-context";
import { bancoDeDados } from "@/firebase-config";
import { Ocorrencia } from "@/types/ocorrencia";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  QuerySnapshot,
  where,
} from "firebase/firestore";
import { converterDocumento, ordenarMaisNovoPrimeiro } from "./ocorrencias-util";

const MAXIMO = 50;

/**
 * MELHORIA: transforma o resultado do getDocs numa lista de Ocorrencia.
 * - `serverTimestamps: "estimate"`: se o reporte acabou de ser criado e o
 *   horário do servidor ainda não voltou, usa uma estimativa em vez de null.
 * - Documentos inválidos (sem título/coordenadas) são pulados em vez de quebrar a tela.
 */
function converterResultado(resultado: QuerySnapshot): Ocorrencia[] {
  return resultado.docs
    .map((documento) =>
      converterDocumento(documento.id, documento.data({ serverTimestamps: "estimate" })),
    )
    .filter((ocorrencia): ocorrencia is Ocorrencia => ocorrencia !== null);
}

/**
 * Busca no Firebase os últimos 50 reportes, do mais novo para o mais antigo.
 * O parâmetro `_centro` não é usado na consulta: a distância até o usuário é
 * calculada no hook (use-ocorrencias.ts). O "_" na frente avisa que é de propósito.
 */
export async function buscarOcorrencias(_centro?: Coordenadas | null): Promise<Ocorrencia[]> {
  const consulta = query(
    collection(bancoDeDados, "ocorrencias"),
    orderBy("criadoEm", "desc"),
    limit(MAXIMO),
  );
  const resultado = await getDocs(consulta);
  return converterResultado(resultado);
}

/**
 * Desafio 2 — PARA IR ALÉM: só os reportes de um usuário.
 *
 * O que entendi do aviso do PDF: `where` num campo (idNotificante) junto com
 * `orderBy` em outro campo (criadoEm) obriga a criar um índice composto no
 * Firestore. Para não depender disso, aqui usamos só o `where` e ordenamos a
 * lista no próprio app (ordenarMaisNovoPrimeiro).
 */
export async function buscarMinhasOcorrencias(uid: string): Promise<Ocorrencia[]> {
  const consulta = query(
    collection(bancoDeDados, "ocorrencias"),
    where("idNotificante", "==", uid),
    limit(MAXIMO),
  );
  const resultado = await getDocs(consulta);
  return ordenarMaisNovoPrimeiro(converterResultado(resultado));
}

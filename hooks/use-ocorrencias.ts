/**
 * Desafio 2 (passo 2): recarregar os reportes sempre que a tela volta a aparecer.
 *
 * O que entendi: com useEffect a busca só rodava quando as coordenadas mudavam.
 * Então, se eu criasse um reporte e voltasse para o mapa, ele não aparecia.
 * O useFocusEffect (do expo-router) roda toda vez que a tela ganha foco, ou
 * seja, ao voltar da tela "Novo reporte" a lista é buscada de novo.
 * O useCallback é exigido pelo useFocusEffect: sem ele a função seria "nova"
 * a cada render e a busca rodaria sem parar.
 *
 * MELHORIAS (além do proposto):
 *  - Não depende mais do GPS para buscar: a lista aparece mesmo com a
 *    localização negada. As coordenadas só servem para calcular a distância
 *    de cada reporte até o usuário (campo `distancia`).
 *  - `recarregar()` para o "puxar para atualizar" da lista (atualizando = true
 *    mostra a bolinha de refresh sem esconder a lista).
 *  - `erro`: se a busca falhar (sem internet, regra não publicada...), a tela
 *    consegue mostrar uma mensagem em vez de ficar vazia sem explicação.
 *  - Opção `somenteDoUsuario`: busca só os reportes de um uid ("Meus reportes").
 *  - Tempo limite de 15 s: sem resposta do servidor, mostra o erro em vez de
 *    deixar o "carregando" girando para sempre.
 *  - Proteção contra respostas fora de ordem: se duas buscas rodarem juntas,
 *    só a mais recente atualiza a tela.
 */
import { Coordenadas } from "@/context/cidade-context";
import { buscarMinhasOcorrencias, buscarOcorrencias } from "@/services/ocorrencias";
import { comTempoLimite, distanciaEmMetros } from "@/services/ocorrencias-util";
import { Ocorrencia } from "@/types/ocorrencia";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";

const TEMPO_LIMITE_MS = 15000;

export type OcorrenciaComDistancia = Ocorrencia & { distancia: number | null };

type Opcoes = {
  /** uid do usuário: quando informado, traz só os reportes dele. */
  somenteDoUsuario?: string | null;
};

/**
 * Carrega as ocorrências. A busca roda toda vez que a tela volta a ficar em foco,
 * assim um reporte recém-criado já aparece ao voltar da tela "Novo reporte".
 */
export function useOcorrencias(coordenadas: Coordenadas | null, opcoes: Opcoes = {}) {
  const { somenteDoUsuario } = opcoes;
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  // Começa true: a primeira busca roda logo ao abrir a tela, e assim não pisca
  // "Nenhum reporte ainda" antes de a resposta chegar.
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Número da busca mais recente. Cada busca guarda o seu número e, quando a
  // resposta chega, só mexe no estado se ainda for a mais recente.
  // (Faz o mesmo papel do `let ativo = true` do PDF, mas vale também para o recarregar.)
  const buscaAtual = useRef(0);

  const buscar = useCallback(
    async (modo: "inicial" | "atualizar") => {
      const minhaBusca = ++buscaAtual.current;
      if (modo === "inicial") setCarregando(true);
      else setAtualizando(true);
      try {
        // comTempoLimite: se em 15 s não vier resposta, desiste e mostra o erro.
        const lista = await comTempoLimite(
          somenteDoUsuario ? buscarMinhasOcorrencias(somenteDoUsuario) : buscarOcorrencias(coordenadas),
          TEMPO_LIMITE_MS,
        );
        if (minhaBusca === buscaAtual.current) {
          setOcorrencias(lista);
          setErro(null);
        }
      } catch (falha) {
        console.warn("Falha ao buscar os reportes", falha);
        if (minhaBusca === buscaAtual.current) {
          const codigo = (falha as { code?: string })?.code;
          setErro(
            codigo === "permission-denied"
              ? "Sem permissão para ler os reportes. Confira a regra de leitura no Firestore."
              : "Não foi possível carregar os reportes. Verifique a internet.",
          );
        }
      } finally {
        if (minhaBusca === buscaAtual.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    // coordenadas fica fora de propósito: chegar a posição do GPS não precisa
    // buscar tudo de novo, só recalcular a distância (feito no useMemo abaixo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [somenteDoUsuario],
  );

  useFocusEffect(
    useCallback(() => {
      buscar("inicial");
      return () => {
        // Saiu da tela: invalida a busca em andamento para ela não mexer no estado.
        buscaAtual.current++;
      };
    }, [buscar]),
  );

  // Distância de cada reporte até o usuário. Recalcula só quando a lista ou a posição mudam.
  const comDistancia = useMemo<OcorrenciaComDistancia[]>(
    () =>
      ocorrencias.map((o) => ({
        ...o,
        distancia: coordenadas ? distanciaEmMetros(coordenadas, o) : null,
      })),
    [ocorrencias, coordenadas],
  );

  const recarregar = useCallback(() => buscar("atualizar"), [buscar]);

  return { ocorrencias: comDistancia, carregando, atualizando, erro, recarregar };
}

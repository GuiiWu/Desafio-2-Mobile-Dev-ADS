/**
 * Desafio 2 (passo 4): tela com a lista dos reportes gravados no Firestore.
 *
 * O que entendi:
 *  - A tela não sabe nada de Firebase: ela só chama o hook useOcorrencias,
 *    que chama o serviço, que faz a consulta. Cada camada tem uma função.
 *  - FlatList é a lista "certa" do React Native para muitos itens: ela só
 *    desenha os itens que estão aparecendo na tela, em vez de todos de uma vez
 *    (como faria um ScrollView com .map).
 *  - keyExtractor diz qual campo identifica cada item (o id do documento),
 *    para o React saber o que mudou quando a lista recarrega.
 *  - renderItem diz como desenhar UM item; a FlatList repete para cada um.
 *
 * PARA IR ALÉM (os três itens do PDF):
 *  - Data de cada reporte: criadoEm chega como Timestamp e vira Date com
 *    .toDate() (feito em services/ocorrencias-util.ts), mostrada como "hoje às 14:05".
 *  - Só os meus reportes: botão "Meus reportes" usa where("idNotificante", "==", uid)
 *    e ordena no app (sem precisar de índice).
 *  - Puxar para atualizar: refreshControl da FlatList.
 *
 * MELHORIAS MINHAS:
 *  - Cada cartão mostra também o tipo (com ícone), o endereço e a distância até você.
 *  - Mensagem de erro com "Tentar de novo" quando a busca falha.
 *  - Botão de atualizar no cabeçalho, porque na web não existe "puxar para atualizar".
 *  - Contador de reportes e mensagens de lista vazia diferentes para cada filtro.
 */
import { STATUS } from "@/constants/status";
import { ROTULOS_DOS_TIPOS } from "@/constants/tipos";
import { useAuth } from "@/hooks/use-auth";
import { useCidade } from "@/hooks/use-cidade";
import { OcorrenciaComDistancia, useOcorrencias } from "@/hooks/use-ocorrencias";
import { formatarData, formatarDistancia } from "@/services/ocorrencias-util";
import { cores } from "@/styles";
import { Feather } from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { ComponentProps, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Filtro = "todos" | "meus";
type NomeDoIcone = ComponentProps<typeof Feather>["name"];

export default function ListaDeReportes() {
  const roteador = useRouter();
  const { user: usuario } = useAuth();
  const { coordenadas } = useCidade();
  const [filtro, setFiltro] = useState<Filtro>("todos");

  // "Meus reportes" só faz sentido logado; sem login, cai para "todos".
  const somenteMeus = filtro === "meus" && !!usuario;
  const { ocorrencias, carregando, atualizando, erro, recarregar } = useOcorrencias(coordenadas, {
    somenteDoUsuario: somenteMeus ? usuario!.uid : null,
  });

  /** Como desenhar um reporte (a FlatList chama isto para cada item). */
  function renderizarReporte({ item }: { item: OcorrenciaComDistancia }) {
    const status = STATUS[item.status];
    const tipo = item.tipo ? ROTULOS_DOS_TIPOS[item.tipo] : null;
    return (
      <View style={estilos.cartao}>
        {/* bolinha com a cor do status (mesma cor do pino no mapa) */}
        <View style={[estilos.bolinha, { backgroundColor: status.cor }]} />
        <View style={estilos.textos}>
          <Text style={estilos.tituloDoReporte}>{item.titulo}</Text>

          {tipo && (
            <View style={estilos.tipo}>
              <Feather name={tipo.icone as NomeDoIcone} size={12} color={cores.cinzaEscuro} />
              <Text style={estilos.tipoTexto}>{tipo.rotulo}</Text>
            </View>
          )}

          {/* `!!` evita que uma string vazia seja renderizada solta (erro no React Native) */}
          {!!item.descricao && <Text style={estilos.descricao}>{item.descricao}</Text>}

          {!!item.endereco && (
            <View style={estilos.linha}>
              <Feather name="map-pin" size={12} color={cores.cinzaClaro} />
              <Text style={estilos.endereco}>{item.endereco}</Text>
            </View>
          )}

          <Text style={estilos.situacao}>
            <Text style={{ color: status.cor, fontWeight: "700" }}>{status.rotulo}</Text>
            {"  ·  "}
            {formatarData(item.criadoEm)}
            {item.distancia !== null && `  ·  a ${formatarDistancia(item.distancia)}`}
          </Text>
        </View>
      </View>
    );
  }

  /** O que aparece quando a lista está vazia: carregando, erro ou realmente vazia. */
  function renderizarVazio() {
    if (carregando) {
      return <ActivityIndicator style={{ marginTop: 24 }} color={cores.verde} />;
    }
    if (erro) {
      return (
        <View style={estilos.vazioBox}>
          <Feather name="wifi-off" size={28} color={cores.cinzaClaro} />
          <Text style={estilos.vazio}>{erro}</Text>
          <Pressable onPress={recarregar}>
            <Text style={estilos.link}>Tentar de novo</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={estilos.vazioBox}>
        <Feather name="inbox" size={28} color={cores.cinzaClaro} />
        <Text style={estilos.vazio}>
          {somenteMeus ? "Você ainda não fez nenhum reporte." : "Nenhum reporte ainda."}
        </Text>
        <Pressable onPress={() => roteador.push("/novo-reporte")}>
          <Text style={estilos.link}>Criar um reporte</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.container} edges={["bottom", "left", "right"]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>
          Reportes{!carregando && !erro ? ` (${ocorrencias.length})` : ""}
        </Text>
        <Pressable
          onPress={recarregar}
          disabled={carregando || atualizando}
          accessibilityLabel="Atualizar lista"
          hitSlop={8}
        >
          {atualizando ? (
            <ActivityIndicator color={cores.verde} />
          ) : (
            <Feather name="refresh-cw" size={20} color={cores.verde} />
          )}
        </Pressable>
      </View>

      {/* Filtro: todos os reportes x só os meus */}
      <View style={estilos.filtros}>
        {(["todos", "meus"] as const).map((opcao) => {
          const ativo = filtro === opcao;
          return (
            <Pressable
              key={opcao}
              onPress={() => setFiltro(opcao)}
              style={[estilos.chip, ativo && estilos.chipAtivo]}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
            >
              <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]}>
                {opcao === "todos" ? "Todos" : "Meus reportes"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {filtro === "meus" && !usuario && (
        <Text style={estilos.aviso}>Entre com a sua conta para ver os seus reportes.</Text>
      )}

      {/* Se a busca falhou mas já havia itens, avisa sem apagar a lista */}
      {!!erro && ocorrencias.length > 0 && <Text style={estilos.aviso}>{erro}</Text>}

      <FlatList
        data={ocorrencias}
        keyExtractor={(ocorrencia) => ocorrencia.id}
        renderItem={renderizarReporte}
        ListEmptyComponent={renderizarVazio}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        // Puxar para atualizar: arrastar a lista para baixo chama recarregar().
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={recarregar}
            colors={[cores.verde]}
            tintColor={cores.verde}
          />
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 8, backgroundColor: cores.bgBrancoGelo },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titulo: { fontSize: 22, fontWeight: "700", color: cores.preto },
  filtros: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipAtivo: { backgroundColor: cores.verde, borderColor: cores.verde },
  chipTexto: { color: cores.cinzaEscuro, fontWeight: "600" },
  chipTextoAtivo: { color: cores.branco },
  aviso: { color: cores.alerta, marginBottom: 12 },
  vazioBox: { alignItems: "center", gap: 8, marginTop: 32 },
  vazio: { textAlign: "center", color: cores.cinzaEscuro },
  link: { color: cores.verde, fontWeight: "700" },
  cartao: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: cores.branco,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  bolinha: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  textos: { flex: 1, gap: 4 },
  tituloDoReporte: { fontSize: 16, fontWeight: "700", color: cores.preto },
  tipo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#eef2f5",
  },
  tipoTexto: { fontSize: 12, color: cores.cinzaEscuro, fontWeight: "600" },
  descricao: { fontSize: 14, color: cores.cinzaEscuro },
  linha: { flexDirection: "row", alignItems: "center", gap: 4 },
  endereco: { flex: 1, fontSize: 12, color: cores.cinzaClaro },
  situacao: { fontSize: 12, color: cores.cinzaClaro, marginTop: 2 },
});

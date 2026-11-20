# Desafio 2 — Listar os reportes do Firebase

Ler do Firestore os reportes gravados no Desafio 1 e mostrá-los no **mapa** (pinos) e em uma **lista**.

## Passo a passo executado

| Passo | O que foi feito | Arquivo |
| --- | --- | --- |
| 1 | O MOCK foi trocado pela consulta `query` + `orderBy("criadoEm", "desc")` + `limit(50)` + `getDocs` | [`services/ocorrencias.ts`](../services/ocorrencias.ts) |
| 2 | `useEffect` trocado por `useFocusEffect` (recarrega ao voltar para a tela) | [`hooks/use-ocorrencias.ts`](../hooks/use-ocorrencias.ts) |
| 3 | Pinos do mapa vêm do Firestore (o `mapa.tsx` não precisou mudar) | [`components/mapa-view.tsx`](../components/mapa-view.tsx) |
| 4 | Tela nova com `FlatList` + Link "Ver reportes" no Perfil | [`app/lista-de-reportes.tsx`](../app/lista-de-reportes.tsx), [`app/(tabs)/perfil.tsx`](../app/(tabs)/perfil.tsx) |
| 5 | Testes (manuais no app + automáticos) | ver abaixo |

Os comentários de cada arquivo explicam o que entendi de cada parte.

## Para ir além (os três itens do PDF)

1. **Data de cada reporte**: `criadoEm` (Timestamp) → `.toDate()` → "hoje às 14:05", "ontem às 09:30" ou "19/11/2026".
2. **Só os meus reportes**: botão "Meus reportes" com `where("idNotificante", "==", uid)`. A ordenação é feita
   no app, como o PDF sugere, então **não precisa criar índice** no Firestore.
3. **Puxar para atualizar**: `refreshControl` da `FlatList`.

## Melhorias minhas

- **Lista funciona sem GPS**: o hook não depende mais da localização para buscar. Ela só é usada
  para mostrar a **distância** ("a 350 m") de cada reporte até o usuário.
- Cartão mostra também **tipo** (com ícone) e **endereço**, gravados no Desafio 1.
- O balão do pino no mapa mostra o tipo do problema.
- **Tempo limite de 15 s** na busca: descobri testando que, sem conexão com o servidor, o `getDocs`
  fica tentando para sempre e a tela ficava girando. Agora ela mostra o erro.
- **Estado de erro** com "Tentar de novo" (e mensagem específica para regra de leitura não publicada).
- **Botão de atualizar** no cabeçalho (na web não existe "puxar para atualizar").
- Contador de reportes e mensagem de lista vazia diferente para "Todos" e "Meus reportes", com atalho para criar um reporte.
- Documentos quebrados no banco (sem título/coordenadas, status desconhecido) não derrubam a tela.
- Proteção contra respostas fora de ordem (duas buscas ao mesmo tempo: vale só a mais recente).
- Funções de conversão, data e distância separadas em [`services/ocorrencias-util.ts`](../services/ocorrencias-util.ts),
  com **testes automáticos** em [`services/ocorrencias-util.test.ts`](../services/ocorrencias-util.test.ts).
- Corrigido o erro de TypeScript que já existia em `app/(tabs)/perfil.tsx`.

## Como testar

```bash
npm test            # testes automáticos
npm run typecheck   # TypeScript
npm run lint        # ESLint
npx expo start      # app (reinicie depois de criar a rota nova)
```

### Confira

- [ ] Mapa: um pino para cada reporte do Firestore, com a cor do status.
- [ ] Lista: título, descrição e situação de cada reporte, o mais novo primeiro.
- [ ] Criar um reporte novo e voltar: ele aparece sem reiniciar o app.
- [ ] Sem nenhum reporte: aparece "Nenhum reporte ainda.".

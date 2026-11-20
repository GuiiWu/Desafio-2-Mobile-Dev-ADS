/// <reference types="node" />
/**
 * Desafio 2 — MELHORIA: testes automáticos das funções de leitura dos reportes.
 * Rodar com:  npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  comTempoLimite,
  converterDocumento,
  distanciaEmMetros,
  formatarData,
  formatarDistancia,
  ordenarMaisNovoPrimeiro,
} from "./ocorrencias-util";

// Imita o Timestamp do Firestore (só precisamos do .toDate()).
const timestamp = (data: Date) => ({ toDate: () => data });

describe("converterDocumento", () => {
  it("converte um documento completo do Desafio 1", () => {
    const data = new Date(2026, 10, 19, 14, 5);
    const ocorrencia = converterDocumento("abc", {
      idNotificante: "uid-1",
      titulo: "Buraco na Rua das Palmeiras",
      descricao: null,
      tipo: "buraco",
      endereco: "Rua das Palmeiras, 120 - Centro, Cuiabá",
      status: "aberto",
      latitude: -15.6,
      longitude: -56.1,
      criadoEm: timestamp(data),
    });
    assert.deepEqual(ocorrencia, {
      id: "abc",
      titulo: "Buraco na Rua das Palmeiras",
      descricao: undefined, // null no banco vira undefined (igual ao `?? undefined` do PDF)
      status: "aberto",
      latitude: -15.6,
      longitude: -56.1,
      tipo: "buraco",
      endereco: "Rua das Palmeiras, 120 - Centro, Cuiabá",
      idNotificante: "uid-1",
      criadoEm: data,
    });
  });

  it("descarta documentos sem título ou sem coordenadas", () => {
    assert.equal(converterDocumento("1", { latitude: 1, longitude: 2 }), null);
    assert.equal(converterDocumento("2", { titulo: "x", latitude: "1", longitude: 2 }), null);
  });

  it("status ou tipo desconhecidos não quebram a tela", () => {
    const o = converterDocumento("3", {
      titulo: "x",
      latitude: 1,
      longitude: 2,
      status: "inventado",
      tipo: "vulcao",
    });
    assert.equal(o?.status, "aberto");
    assert.equal(o?.tipo, undefined);
    assert.equal(o?.criadoEm, null);
  });
});

describe("distância", () => {
  it("calcula ~111 km para 1 grau de latitude", () => {
    const metros = distanciaEmMetros({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    assert.ok(Math.abs(metros - 111195) < 100, `deu ${metros}`);
  });

  it("formata em metros ou quilômetros", () => {
    assert.equal(formatarDistancia(347), "350 m");
    assert.equal(formatarDistancia(1234), "1,2 km");
  });
});

describe("formatarData", () => {
  const agora = new Date(2026, 10, 19, 21, 0);

  it("hoje, ontem e data completa", () => {
    assert.equal(formatarData(new Date(2026, 10, 19, 9, 5), agora), "hoje às 09:05");
    assert.equal(formatarData(new Date(2026, 10, 18, 23, 30), agora), "ontem às 23:30");
    assert.equal(formatarData(new Date(2026, 9, 2, 8, 0), agora), "02/10/2026");
  });

  it("sem data (acabou de ser criado)", () => {
    assert.equal(formatarData(null, agora), "agora mesmo");
  });
});

describe("comTempoLimite", () => {
  it("devolve o valor se a resposta chega a tempo", async () => {
    assert.equal(await comTempoLimite(Promise.resolve(42), 50), 42);
  });

  it("desiste quando passa do tempo", async () => {
    const nuncaResponde = new Promise(() => {});
    await assert.rejects(comTempoLimite(nuncaResponde, 20), { code: "tempo-esgotado" });
  });

  it("repassa o erro original", async () => {
    await assert.rejects(comTempoLimite(Promise.reject(new Error("x")), 50), /x/);
  });
});

describe("ordenarMaisNovoPrimeiro", () => {
  it("ordena do mais novo para o mais antigo, sem data no topo", () => {
    const base = { titulo: "x", status: "aberto" as const, latitude: 0, longitude: 0 };
    const lista = [
      { ...base, id: "velho", criadoEm: new Date(2026, 0, 1) },
      { ...base, id: "sem-data", criadoEm: null },
      { ...base, id: "novo", criadoEm: new Date(2026, 5, 1) },
    ];
    assert.deepEqual(
      ordenarMaisNovoPrimeiro(lista).map((o) => o.id),
      ["sem-data", "novo", "velho"],
    );
  });
});

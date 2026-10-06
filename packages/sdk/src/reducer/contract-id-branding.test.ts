import { compileManifest } from "./manifest/compiler";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineGameContract } from "./authoring/contract";

function buildMinimalManifest() {
  return compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [
      {
        id: "deck-set",
        name: "Cards",
        cardSchema: z.object({}),
        defaultHome: { type: "detached" },
        cards: [
          {
            id: "c-alpha",
            name: "c-alpha",
            cardType: "standard",
            count: 1,
            properties: {},
          },
          {
            id: "c-beta",
            name: "c-beta",
            cardType: "standard",
            count: 1,
            properties: {},
          },
        ],
      },
    ],
    zones: [
      {
        id: "hand",
        name: "hand",
        scope: "perPlayer",
        visibility: "ownerOnly",
        allowedCardSetIds: ["deck-set"],
      },
      {
        id: "discard",
        name: "discard",
        scope: "shared",
        visibility: "public",
        allowedCardSetIds: ["deck-set"],
      },
    ],
  });
}

describe("defineGameContract id branding validation", () => {
  test("accepts state schemas that use manifest.ids.* branded schemas", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            knowerPlayerId: manifest.ids.playerId,
            pendingCardId: manifest.ids.cardId.nullable(),
            activeZoneIds: z.array(manifest.ids.zoneId),
            description: z.string(),
          }),
          private: z.object({
            hiddenPlayerId: manifest.ids.playerId.optional(),
          }),
          hidden: z.object({}),
        },
      }),
    ).not.toThrow();
  });
  test("rejects a top-level field named as a manifest id that uses raw z.string()", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            currentPlayerId: z.string(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/state\.public\.currentPlayerId/);
  });
  test("rejects a nullable raw string for a manifest id field", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            pendingCardId: z.string().nullable(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/pendingCardId/);
  });
  test("rejects z.array(z.string()) when the field name is a plural manifest id", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            cardIds: z.array(z.string()),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/cardIds/);
  });
  test("allows raw z.string() for fields that are not manifest-scoped ids", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            winnerReason: z.string().nullable(),
            description: z.string(),
            seed: z.number(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).not.toThrow();
  });
  test("rejects a field whose suffix matches a manifest id (e.g. knowerPlayerId)", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            knowerPlayerId: z.string(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/knowerPlayerId/);
  });
});

import React from "react";
import {
  Game,
  HandSurfaceView,
  Interaction,
  PlayerRoster,
  dropTargetIdFor,
} from "@dreamboard-games/sdk/runtime/primitives";
import {
  CardFace,
  CostDisplay,
  DefaultSlotItem,
  HandView,
  Panel,
  ResourceCounter,
  SlotSystem,
  ThemeProvider,
} from "@dreamboard-games/sdk/ui";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "@dreamboard-games/plugin-runtime-contract";

function renderCards(config) {
  if (!config.cards?.length) return null;
  if (config.interactionMode === "drag") {
    return React.createElement(
      Interaction.Root,
      { interaction: config.interaction },
      React.createElement(HandSurfaceView, {
        zone: "hand",
        cards: config.cards,
        layout: "strip",
        mobileInteraction: "drag-to-target",
        cardSize: "sm",
        ariaLabel: `${config.displayName} draggable cards`,
        dropTargets: config.dropTargets.map((target, index) => ({
          targetId: dropTargetIdFor(target.kind, target.id),
          label: target.label,
          order: index,
          render: () =>
            React.createElement(
              "span",
              {
                "data-reference-drop-target": target.id,
                style: {
                  alignItems: "center",
                  border: "2px dashed currentColor",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "center",
                  minHeight: 96,
                  minWidth: 144,
                  padding: 12,
                },
              },
              target.label,
            ),
        })),
        renderCard: (card, state) => {
          const { distinctlyEligible: _distinctlyEligible, ...cardState } =
            state;
          return React.createElement(
            Interaction.CardInput,
            {
              input: config.cardInputKey,
              unsafeCardId: card.id,
              "aria-label": `Drag ${card.name}`,
            },
            React.createElement(CardFace, {
              card,
              size: "sm",
              ...cardState,
            }),
          );
        },
        actionsSlot: () =>
          React.createElement(Interaction.Submit, null, config.actionLabel),
      }),
    );
  }
  return React.createElement(HandView, {
    cards: config.cards,
    layout: config.mobile ? { desktop: "fan", mobile: "tray" } : "strip",
    cardSize: "sm",
    "aria-label": `${config.displayName} cards`,
    renderCard: (card, state) =>
      React.createElement(CardFace, {
        card,
        size: "sm",
        ...state,
      }),
  });
}

function renderDraftInteraction(config) {
  if (config.interactionMode !== "draft") return null;
  const input = config.draftInput;
  return React.createElement(
    Interaction.Root,
    { interaction: config.interaction },
    React.createElement(
      "label",
      {
        style: {
          display: "grid",
          gap: 8,
          maxWidth: 240,
        },
      },
      React.createElement("span", null, input.label),
      React.createElement(Interaction.Input, {
        name: input.key,
        type: "number",
        min: input.min,
        max: input.max,
        step: 1,
        inputMode: "numeric",
        parse: Number,
        "aria-label": input.label,
        style: { minHeight: 44 },
      }),
      React.createElement(Interaction.Submit, null, config.actionLabel),
    ),
  );
}

function renderResources(config) {
  if (!config.resources?.length) return null;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      ResourceCounter.Root,
      {
        resources: config.resources.map((resource) => ({
          type: resource.type,
          label: resource.label,
          icon: resource.icon,
        })),
        counts: Object.fromEntries(
          config.resources.map((resource) => [resource.type, resource.count]),
        ),
      },
      React.createElement(
        ResourceCounter.Item,
        null,
        React.createElement(ResourceCounter.Icon),
        React.createElement(ResourceCounter.Label),
        React.createElement(ResourceCounter.Count),
      ),
    ),
    React.createElement(CostDisplay, {
      cost: Object.fromEntries(
        config.resources.slice(0, 2).map((resource) => [resource.type, 1]),
      ),
      currentResources: Object.fromEntries(
        config.resources.map((resource) => [resource.type, resource.count]),
      ),
      resourceDefs: config.resources.map((resource) => ({
        type: resource.type,
        label: resource.label,
      })),
    }),
  );
}

function renderSlots(config) {
  if (!config.slots?.length) return null;
  return React.createElement(SlotSystem, {
    slots: config.slots,
    occupants: [],
    layout: "grid",
    renderSlot: (slot, occupants) =>
      React.createElement(DefaultSlotItem, {
        name: slot.name,
        description: slot.description,
        capacity: slot.capacity,
        occupantCount: occupants.length,
        isAvailable: true,
      }),
  });
}

export function createReferenceGameRoot(config) {
  return function ReferenceGameRoot() {
    return React.createElement(
      ThemeProvider,
      { reducedMotion: "force" },
      React.createElement(Game.Root, null, (state) =>
        React.createElement(
          Game.Viewport,
          {
            className: "min-w-0",
            "data-reference-game": config.id,
            "data-reference-scenario": config.scenarioId,
            "data-plugin-runtime-protocol": DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
          },
          React.createElement(
            Panel.Root,
            { style: { width: "min(100%, 760px)", margin: "0 auto" } },
            React.createElement(
              Panel.Header,
              null,
              React.createElement(Panel.Title, null, config.displayName),
              React.createElement(
                Panel.Description,
                { "data-reference-phase": state.phase ?? "none" },
                config.summary,
              ),
            ),
            React.createElement(
              Panel.Body,
              null,
              React.createElement(
                PlayerRoster.Root,
                null,
                React.createElement(PlayerRoster.List, {
                  children: (player) =>
                    React.createElement(
                      "span",
                      { "data-reference-player": player.playerId },
                      player.name,
                    ),
                }),
              ),
              renderResources(config),
              renderSlots(config),
              renderCards(config),
              renderDraftInteraction(config),
            ),
            config.interactionMode === "drag" ||
              config.interactionMode === "draft"
              ? null
              : React.createElement(
                  Panel.Actions,
                  null,
                  React.createElement(
                    Interaction.Root,
                    { interaction: config.interaction },
                    React.createElement(
                      Interaction.Submit,
                      { params: {} },
                      config.actionLabel,
                    ),
                  ),
                ),
          ),
        ),
      ),
    );
  };
}

export const Root = createReferenceGameRoot({
  id: "hearts",
  scenarioId: "hearts.pass-three.mobile",
  displayName: "Hearts",
  interaction: "pass-three",
  actionLabel: "Pass three cards",
  summary: "Select and pass three private cards.",
  mobile: true,
  cards: [
    { id: "two-clubs", name: "Two of Clubs", properties: { icon: "2C" } },
    {
      id: "queen-spades",
      name: "Queen of Spades",
      properties: { icon: "QS" },
    },
    {
      id: "ace-hearts",
      name: "Ace of Hearts",
      properties: { icon: "AH" },
    },
    {
      id: "seven-diamonds",
      name: "Seven of Diamonds",
      properties: { icon: "7D" },
    },
    { id: "ten-clubs", name: "Ten of Clubs", properties: { icon: "10C" } },
  ],
});

export const uiContractFingerprint =
  "sha256:d11b8694328d711612c214b6db70e0d9e4e01211941c9d061f136b89515b995a";

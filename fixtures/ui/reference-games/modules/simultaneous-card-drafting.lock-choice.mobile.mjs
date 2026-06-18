import React from "react";
import {
  Game,
  HandStagingView,
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
  if (config.interactionMode === "select") {
    return React.createElement(
      Interaction.Root,
      { interaction: config.interaction },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(HandStagingView, {
          zone: "hand",
          cardSize: "sm",
          label: `${config.displayName} selected cards`,
          ariaLabel: `${config.displayName} selected cards`,
          renderEmptySlot: (index) =>
            React.createElement(
              "span",
              {
                style: {
                  color: "var(--muted-foreground, #666)",
                  fontSize: 12,
                },
              },
              `Pick ${index + 1}`,
            ),
          renderCard: (card) =>
            React.createElement(CardFace, {
              card,
              size: "sm",
              selected: true,
            }),
        }),
        React.createElement(HandSurfaceView, {
          zone: "hand",
          cards: config.cards,
          layout: "strip",
          mobileInteraction: "direct-activate",
          cardSize: "sm",
          ariaLabel: `${config.displayName} selectable cards`,
          summarySlot: (summary) =>
            React.createElement(
              "p",
              {
                style: {
                  margin: "0 0 8px",
                  textAlign: "center",
                },
              },
              `Selected ${summary.selectedCount}/${config.selectionCount}`,
            ),
          renderCard: (card, state) => {
            const { distinctlyEligible: _distinctlyEligible, ...cardState } =
              state;
            return React.createElement(
              Interaction.CardInput,
              {
                input: config.cardInputKey,
                unsafeCardId: card.id,
                "aria-label": `Select ${card.name}`,
                onPointerDown: (event) => event.stopPropagation(),
                onPointerUp: (event) => event.stopPropagation(),
                onPointerCancel: (event) => event.stopPropagation(),
                onClick: (event) => event.stopPropagation(),
                onKeyDown: (event) => event.stopPropagation(),
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
      ),
    );
  }
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
              config.interactionMode === "draft" ||
              config.interactionMode === "select"
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
  id: "simultaneous-card-drafting",
  scenarioId: "simultaneous-card-drafting.lock-choice.mobile",
  displayName: "Simultaneous Card Drafting",
  interaction: "lock-choice",
  actionLabel: "Lock choice",
  summary: "Lock a private draft choice before reveal.",
  mobile: true,
  cards: [
    { id: "lantern", name: "Lantern", properties: { subtitle: "Light" } },
    { id: "garden", name: "Garden", properties: { subtitle: "Nature" } },
    { id: "bell", name: "Bell", properties: { subtitle: "Sound" } },
    { id: "map", name: "Map", properties: { subtitle: "Journey" } },
  ],
});

export const uiContractFingerprint =
  "sha256:4016f48a07fa5246662cf0a7a833868c5ac3f71319d1f40fa74a104a747fd3d7";

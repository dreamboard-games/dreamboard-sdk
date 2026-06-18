import {
  DiceRoller,
  OutcomeDialog,
  type ViewCard,
} from "@dreamboard-games/sdk/ui";
import type { ReactNode } from "react";
import {
  Dice,
  Game,
  Phase,
  PlayerRoster,
  UI,
  type GameMe,
  type GamePlayers,
  type GameTurn,
  type GameView,
  type PhaseName,
} from "#dreamboard/ui-contract";
import type { CardId, CardType } from "../shared/manifest-contract";
import { FrontierResourceCounter } from "./components/resource-counter";
import { FrontierTrailsBoard } from "./frontier-trails-board";
import { FrontierInteractionRoutes } from "./interaction-routes";
import { useFrontierSurfaces } from "./surfaces";
import { PANEL_CLASS, SECTION_HEADING_CLASS } from "./styles";
import type { CharterHandSurface, FrontierSurfaces } from "./types";

const CHARTER_CARD_LABEL: Record<string, string> = {
  landmark: "Landmark",
  scout: "Scout",
  surveyGrant: "Survey Grant",
  claimMarker: "Claim Marker",
  shortcut: "Shortcut",
};

const CHARTER_CARD_ICON: Record<string, string> = {
  landmark: "✨",
  scout: "🧭",
  surveyGrant: "📜",
  claimMarker: "📍",
  shortcut: "🥾",
};

const CHARTER_CARD_EFFECT: Record<string, string> = {
  landmark: "1 Renown",
  scout: "Move storm, seize a supply",
  surveyGrant: "Claim any 2 supplies",
  claimMarker: "Claim all of one supply",
  shortcut: "Build 2 free trails",
};

type CharterCardView = ViewCard<CardId, CardType>;

function isCharterCardView<Card>(card: Card): card is Card & CharterCardView {
  return (
    !!card &&
    typeof card === "object" &&
    "cardType" in card &&
    "properties" in card
  );
}

function CharterCardFace({ card }: { card: CharterCardView }) {
  const type = card.cardType;
  const icon = CHARTER_CARD_ICON[type] ?? "🎴";
  const label = CHARTER_CARD_LABEL[type] ?? type;
  const effect = CHARTER_CARD_EFFECT[type] ?? "";
  return (
    <div className="flex h-full flex-col items-center justify-between p-2 text-center">
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-[11px] font-bold leading-tight text-slate-800">
        {label}
      </span>
      <span className="text-[9px] leading-tight text-slate-500">{effect}</span>
    </div>
  );
}

function CharterCardVisual({ card }: { card: CharterCardView }) {
  return (
    <div
      className="relative h-32 w-20 overflow-hidden rounded-[18px_6px_18px_6px/6px_18px_6px_18px] border-[3px] border-slate-900 bg-[#fdfbf7] shadow-[4px_4px_0_#111] sm:h-36 sm:w-24"
      aria-hidden
    >
      <CharterCardFace card={card} />
    </div>
  );
}

function CharterCardItem({
  card,
  viewCard,
  charterHand,
}: {
  card: Parameters<CharterHandSurface["Card"]>[0]["card"];
  viewCard: CharterCardView;
  charterHand: CharterHandSurface;
}) {
  return (
    <charterHand.Card
      card={card}
      className="border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-55"
      aria-label={`Play ${CHARTER_CARD_LABEL[viewCard.cardType] ?? viewCard.cardType}`}
    >
      <CharterCardVisual card={viewCard} />
    </charterHand.Card>
  );
}

function CharterCardHand({
  cardCount,
  charterHand,
}: {
  cardCount: number;
  charterHand: CharterHandSurface;
}) {
  return (
    <section
      className="flex flex-col gap-2"
      aria-label={`Charter cards, ${cardCount} in hand`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className={SECTION_HEADING_CLASS}>Charter cards</h2>
        <span className="text-xs font-semibold text-slate-500">
          {cardCount}
        </span>
      </div>
      <charterHand.Hand
        className="flex min-h-[118px] flex-wrap gap-3"
        empty={<span className="text-sm text-slate-500">No charter cards</span>}
      >
        <charterHand.Cards>
          {(card) => {
            const viewCard = isCharterCardView(card) ? card : null;
            return viewCard ? (
              <CharterCardItem
                key={card.id}
                card={card}
                viewCard={viewCard}
                charterHand={charterHand}
              />
            ) : null;
          }}
        </charterHand.Cards>
      </charterHand.Hand>
    </section>
  );
}

function FrontierSurfaceProvider({
  children,
}: {
  children: (surfaces: FrontierSurfaces) => ReactNode;
}) {
  const surfaces = useFrontierSurfaces();

  return <>{children(surfaces)}</>;
}

type PhaseTitleContext = {
  setupPlacedCamp: boolean;
  stormActive: boolean;
  isMyTurn: boolean;
  diceRolled: boolean;
  currentPlayerName: string | undefined;
};

type PhaseRouteConfig = {
  gameplayPhase: PhaseName;
  badgeLabel: (view: GameView) => string;
  title: (context: PhaseTitleContext) => string | undefined;
};

function FrontierLayout({
  route,
  surfaces,
  view,
  players,
  me,
  turn,
}: {
  route: PhaseRouteConfig;
  surfaces: FrontierSurfaces;
  view: GameView;
  players: GamePlayers;
  me: GameMe;
  turn: GameTurn;
}) {
  const influenceByPlayer = view.influenceByPlayerId;
  const scoutsByPlayer = view.scoutsByPlayerId;
  const stormActive =
    view.stormPending && view.discardPending.length === 0 && turn.isMine;
  const setupPlacedCamp = view.setup?.placedCamp ?? false;
  const currentPlayerName = turn.currentPlayerId
    ? (players.byId.get(turn.currentPlayerId)?.name ?? turn.currentPlayerId)
    : undefined;
  const titleSub = view.outcome
    ? "Game over"
    : route.title({
        setupPlacedCamp,
        stormActive,
        isMyTurn: turn.isMine,
        diceRolled: view.diceRolled,
        currentPlayerName,
      });

  return (
    <>
      <main className="flex min-h-screen flex-col bg-[#fdfbf7] text-slate-900">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-900 bg-white px-4 py-3">
          <div>
            <h1 className="text-2xl font-black tracking-normal">
              Frontier Trails
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              {titleSub ?? "Frontier command is watching the board."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded border-2 border-slate-900 bg-[#fff9c4] px-2 py-1 text-xs font-bold uppercase text-slate-900 shadow-[2px_2px_0_#111]">
              {route.badgeLabel(view)}
            </span>
            <Dice.Root values={view.diceValues} count={2}>
              <Dice.Values>
                {({ values, sum }) =>
                  values ? (
                    <DiceRoller
                      values={values}
                      render={({ values: renderedValues }) => (
                        <span
                          className="rounded border-2 border-slate-900 bg-white px-2 py-1 text-sm font-bold tabular-nums shadow-[2px_2px_0_#111]"
                          aria-label={`Dice: ${renderedValues?.[0]} plus ${renderedValues?.[1]} equals ${sum ?? 0}`}
                        >
                          🎲 {renderedValues?.[0]} + {renderedValues?.[1]} ={" "}
                          {sum}
                        </span>
                      )}
                    />
                  ) : null
                }
              </Dice.Values>
            </Dice.Root>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-h-[520px] overflow-hidden rounded-lg border-2 border-slate-900 bg-white shadow-[3px_3px_0_#111] xl:min-h-[min(720px,calc(100vh-170px))]">
            <FrontierTrailsBoard
              board={surfaces.frontierBoard}
              view={view}
              players={players.byId}
              controllingPlayerId={me.playerId}
              isMyTurn={turn.isMine}
              gameplayPhase={route.gameplayPhase}
            />
          </section>

          <aside className="flex min-h-0 flex-col gap-4">
            <PlayerRoster.Root
              score={(playerId) => influenceByPlayer[playerId] ?? 0}
              scoreLabel="Renown"
              badges={(playerId) => [
                view.tradeNetworkOwner === playerId
                  ? {
                      key: "trade-network",
                      icon: "🛤️",
                      tooltip: "Trade network",
                    }
                  : null,
                view.explorerGuildOwner === playerId
                  ? {
                      key: "explorer-guild",
                      icon: "🧭",
                      label: scoutsByPlayer[playerId] ?? 0,
                      tooltip: "Explorer guild",
                    }
                  : null,
              ]}
            >
              <section className={PANEL_CLASS}>
                <h2 className={SECTION_HEADING_CLASS}>Captains</h2>
                <PlayerRoster.List className="mt-2 flex flex-col gap-2">
                  {(player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between rounded border-2 border-l-8 border-slate-900 bg-[#fdfbf7] px-2 py-1 text-left text-sm font-semibold"
                      style={{ borderLeftColor: player.color }}
                    >
                      <span className="flex items-center gap-2">
                        <PlayerRoster.Name player={player} />
                        <PlayerRoster.Badges
                          player={player}
                          className="flex items-center gap-1 text-xs"
                        />
                        {player.isActive ? (
                          <span className="text-xs text-red-600">active</span>
                        ) : null}
                      </span>
                      <PlayerRoster.Score player={player} />
                    </div>
                  )}
                </PlayerRoster.List>
              </section>
            </PlayerRoster.Root>

            <section className={PANEL_CLASS}>
              <h2 className={`${SECTION_HEADING_CLASS} mb-2`}>Resources</h2>
              <FrontierResourceCounter counts={view.myResources} showZero />
            </section>

            <section className={PANEL_CLASS}>
              <h2 className={SECTION_HEADING_CLASS}>Actions</h2>
              <div className="mt-3 grid gap-3">
                <FrontierInteractionRoutes
                  {...surfaces}
                  diceValues={view.diceValues}
                  pendingTrade={view.pendingTrade}
                />
              </div>
            </section>
          </aside>
        </div>

        <section className="border-t-2 border-slate-900 bg-white px-4 py-3">
          <CharterCardHand
            cardCount={view.myCharterCardIds.length}
            charterHand={surfaces.charterHand}
          />
        </section>
      </main>

      <OutcomeDialog
        outcome={view.outcome}
        playerName={(playerId) => players.byId.get(playerId)?.name ?? playerId}
      />
    </>
  );
}

function PhaseGameUI({ route }: { route: PhaseRouteConfig }) {
  return (
    <Game.Root>
      {({ view, players, me, turn }) => (
        <FrontierSurfaceProvider>
          {(surfaces) => (
            <FrontierLayout
              route={route}
              surfaces={surfaces}
              view={view}
              players={players}
              me={me}
              turn={turn}
            />
          )}
        </FrontierSurfaceProvider>
      )}
    </Game.Root>
  );
}

function GameUI() {
  return (
    <Phase.Switch
      routes={{
        setup: () => (
          <PhaseGameUI
            route={{
              gameplayPhase: "setup",
              badgeLabel: () => "Setup",
              title: ({ setupPlacedCamp }) =>
                setupPlacedCamp
                  ? "Stake a route from your new camp."
                  : "Pick a coastal camp site.",
            }}
          />
        ),
        playerTurn: () => (
          <PhaseGameUI
            route={{
              gameplayPhase: "playerTurn",
              badgeLabel: (view) =>
                view.diceRolled ? "Main actions" : "Roll dice",
              title: ({
                stormActive,
                isMyTurn,
                diceRolled,
                currentPlayerName,
              }) =>
                stormActive
                  ? "The storm is loose - click a hex to relocate it."
                  : isMyTurn
                    ? diceRolled
                      ? "Build, trade, or end your turn."
                      : "Roll to start your turn."
                    : currentPlayerName
                      ? `Waiting for ${currentPlayerName}.`
                      : undefined,
            }}
          />
        ),
        checkGameEnd: () => (
          <PhaseGameUI
            route={{
              gameplayPhase: "checkGameEnd",
              badgeLabel: () => "Checking score",
              title: () => "Checking frontier influence.",
            }}
          />
        ),
        gameOver: () => (
          <PhaseGameUI
            route={{
              gameplayPhase: "gameOver",
              badgeLabel: () => "Game over",
              title: () => "Game over",
            }}
          />
        ),
      }}
    />
  );
}

export default function App() {
  return (
    <UI.Root>
      <GameUI />
    </UI.Root>
  );
}

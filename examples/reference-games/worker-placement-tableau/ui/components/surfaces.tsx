import type {
  BoardSurface,
  GameView,
  HandSurface,
} from "../../shared/generated/ui-contract.ts";
import { Hammer, PackageOpen, Sparkles } from "lucide-react";
import {
  ACTION_SPACE_HINT,
  ACTION_SPACE_LABEL,
  ITEM_LABEL,
  PANEL_CLASS,
  RESOURCE_ICON,
  SECTION_HEADING_CLASS,
  STAMP_CLASS,
} from "../styles";
import type {
  CardId,
  PieceId,
  PlayerId,
  SpaceId,
} from "../../shared/manifest-contract";

export function SeasonIndicator({ season }: { season: number }) {
  return <span className={STAMP_CLASS}>Season {season} of 6</span>;
}

export function ActionBoard({
  view,
  board,
  reassignCue = null,
}: {
  view: GameView;
  board: BoardSurface;
  reassignCue?: { pieceId: PieceId | string | null } | null;
}) {
  const enabled = new Set(view.enabledActionSpaces);
  const fixed: readonly SpaceId[] = [
    "lumberyard",
    "quarry",
    "market",
    "guild-hall",
    "training-hall",
    "workshop",
  ];
  const variable = view.setupVariablePoolDraw;
  const all: readonly SpaceId[] = [...fixed, ...variable];

  return (
    <section
      aria-label="Action board"
      className={`${PANEL_CLASS} flex flex-col gap-3 ${
        reassignCue ? "ring-4 ring-[#2d5da1]/20" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className={SECTION_HEADING_CLASS}>Action board</h2>
        <span className="text-xs text-slate-500">
          {enabled.size} active spaces
        </span>
      </div>
      {reassignCue ? (
        <div className="rounded-md border-2 border-[#2d5da1] bg-[#e8f1ff] px-3 py-2 text-sm font-bold text-[#1f3f73]">
          {reassignCue.pieceId
            ? `Reassign ${reassignCue.pieceId}: choose a highlighted destination.`
            : "Reassign: choose which worker to move first."}
        </div>
      ) : null}
      <board.Root>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {all.map((spaceId) => {
            const workersHere = workersOnSpace(view, spaceId);
            const targetProps =
              reassignCue == null
                ? {}
                : reassignCue.pieceId
                  ? {
                      interaction: "placement.reassign",
                      input: "toSpaceId",
                    }
                  : {
                      disabled: true,
                      title: "Choose a worker before selecting a destination.",
                    };
            return (
              <board.Space
                key={spaceId}
                value={spaceId}
                {...targetProps}
                className="flex min-h-[88px] flex-col gap-1 rounded-lg border-2 border-[#2d2d2d] bg-[#fdfbf7] p-2 text-left transition-shadow hover:shadow-[2px_2px_0_#2d2d2d] data-[eligible=true]:bg-[#fff9c4] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold">
                    {ACTION_SPACE_LABEL[spaceId] ?? spaceId}
                  </span>
                  {(variable as readonly string[]).includes(spaceId) ? (
                    <Sparkles
                      className="h-3 w-3 text-[#2d5da1]"
                      strokeWidth={2.5}
                      aria-label="Variable space"
                    />
                  ) : null}
                </div>
                <span className="text-[11px] text-slate-600">
                  {ACTION_SPACE_HINT[spaceId] ?? ""}
                </span>
                <div className="mt-auto flex flex-wrap gap-1">
                  {workersHere.map(({ pieceId, ownerId }) => (
                    <WorkerPip
                      key={pieceId}
                      pieceId={pieceId}
                      ownerId={ownerId}
                    />
                  ))}
                </div>
              </board.Space>
            );
          })}
        </div>
      </board.Root>
    </section>
  );
}

function workersOnSpace(
  view: GameView,
  spaceId: string,
): Array<{ pieceId: string; ownerId: PlayerId }> {
  const out: Array<{ pieceId: string; ownerId: PlayerId }> = [];
  for (const [ownerId, pieces] of Object.entries(
    view.workerLocationsByPlayerId,
  ) as Array<[PlayerId, Record<string, SpaceId | null>]>) {
    for (const [pieceId, loc] of Object.entries(pieces)) {
      if (loc === spaceId) out.push({ pieceId, ownerId });
    }
  }
  return out;
}

function WorkerPip({
  pieceId,
  ownerId,
}: {
  pieceId: string;
  ownerId: PlayerId;
}) {
  const isMaster = pieceId.startsWith("master");
  const tone = ownerId === "player-1" ? "bg-[#ff4d4d]" : "bg-[#2d5da1]";
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#2d2d2d] text-[10px] font-bold text-white ${tone}`}
      aria-label={`${ownerId} ${isMaster ? "master" : "apprentice"}`}
      title={`${ownerId} ${isMaster ? "master" : "apprentice"}`}
    >
      {isMaster ? "M" : "A"}
    </span>
  );
}

export function WorkshopMat({
  view,
  playerId,
  label,
  board,
  interactive = false,
}: {
  view: GameView;
  playerId: PlayerId;
  label: string;
  board?: BoardSurface;
  interactive?: boolean;
}) {
  const occupancy = view.matItemsByPlayerId[playerId] ?? {};
  const grid = (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => {
          const cellId = `cell-r${row}-c${col}` as SpaceId;
          const itemId = occupancy[cellId];
          const cell = (
            <CraftCell
              cellId={cellId}
              itemId={itemId}
              selectable={interactive && !itemId}
            />
          );
          if (!interactive || !board) return <div key={cellId}>{cell}</div>;
          return (
            <board.Space
              key={cellId}
              value={cellId}
              aria-label={`Craft on ${cellId}`}
            >
              {cell}
            </board.Space>
          );
        }),
      )}
    </div>
  );

  return (
    <section
      aria-label={`${label} workshop mat`}
      className={`${PANEL_CLASS} flex flex-col gap-2`}
    >
      <h2 className={SECTION_HEADING_CLASS}>{label}'s workshop</h2>
      {interactive && board ? <board.Root>{grid}</board.Root> : grid}
    </section>
  );
}

function CraftCell({
  cellId,
  itemId,
  selectable,
}: {
  cellId: string;
  itemId: string | undefined;
  selectable: boolean;
}) {
  const content = itemId ? (
    <span className="flex flex-col items-center">
      <Hammer className="h-4 w-4" strokeWidth={2.5} />
      <span className="mt-0.5 text-[10px]">{ITEM_LABEL[itemId] ?? itemId}</span>
    </span>
  ) : null;
  return (
    <span
      className={`flex h-12 items-center justify-center rounded-md border-2 border-[#2d2d2d] text-xs font-bold ${
        itemId ? "bg-[#fff9c4]" : "bg-[#fdfbf7]"
      } ${
        selectable
          ? "cursor-pointer bg-[#fff9c4] shadow-[2px_2px_0_#2d2d2d] hover:bg-[#fff3a3]"
          : "cursor-default"
      }`}
      title={itemId ? ITEM_LABEL[itemId] : "empty cell"}
      aria-label={`Craft on ${cellId}`}
    >
      {content}
    </span>
  );
}

export function WakeUpTrack({
  view,
  track,
}: {
  view: GameView;
  track: BoardSurface;
}) {
  const slots = ["1", "2", "3", "4"] as const;
  const labels: Record<(typeof slots)[number], string> = {
    "1": "First - no bonus",
    "2": "First - +1 coin",
    "3": "Second - +1 apprentice card",
    "4": "Second - +1 wood +1 stone",
  };
  const slotSpaceIds: Record<(typeof slots)[number], SpaceId> = {
    "1": "wake-up-1",
    "2": "wake-up-2",
    "3": "wake-up-3",
    "4": "wake-up-4",
  };
  return (
    <section
      aria-label="Wake-up track"
      className={`${PANEL_CLASS} flex flex-col gap-2`}
    >
      <h2 className={SECTION_HEADING_CLASS}>Wake-up track</h2>
      <track.Root>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const occupant = view.wakeUpSelections[slot] ?? null;
            const slotSpaceId = slotSpaceIds[slot];
            return (
              <track.Space
                key={slot}
                value={slotSpaceId}
                data-claimed={occupant ? "true" : undefined}
                className="flex flex-col gap-1 rounded-md border-2 border-[#2d2d2d] bg-[#fdfbf7] p-2 text-left transition-shadow hover:shadow-[2px_2px_0_#2d2d2d] data-[eligible=true]:bg-[#fff9c4] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[claimed=true]:bg-[#e5e0d8] data-[claimed=true]:opacity-100 data-[claimed=true]:shadow-[2px_2px_0_#2d2d2d]"
              >
                <span className="font-display text-sm font-bold">
                  Slot {slot}
                </span>
                <span className="text-[11px] text-slate-600">
                  {labels[slot]}
                </span>
                <span className="text-xs">
                  {occupant ? (
                    <span className="font-bold">{occupant}</span>
                  ) : (
                    <span className="text-slate-400">unclaimed</span>
                  )}
                </span>
              </track.Space>
            );
          })}
        </div>
      </track.Root>
    </section>
  );
}

export function ResourcesPanel({ view }: { view: GameView }) {
  return (
    <section
      aria-label="Your resources"
      className={`${PANEL_CLASS} flex flex-col gap-2`}
    >
      <h2 className={SECTION_HEADING_CLASS}>Resources</h2>
      <div className="flex flex-wrap gap-2">
        {(["wood", "stone", "coin"] as const).map((res) => (
          <span
            key={res}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#2d2d2d] bg-[#fdfbf7] px-2 py-1 text-sm font-bold tabular-nums shadow-[1px_1px_0_#2d2d2d]"
          >
            {RESOURCE_ICON[res]} {view.myResources[res] ?? 0}
          </span>
        ))}
      </div>
    </section>
  );
}

export function RosterPanel({
  view,
  playerId,
}: {
  view: GameView;
  playerId: PlayerId;
}) {
  const cap = view.apprenticeRosterSizeByPlayerId[playerId] ?? 0;
  const pending = view.pendingApprenticeBuysByPlayerId[playerId] ?? 0;
  const myWorkers = view.workerLocationsByPlayerId[playerId] ?? {};
  const placedApprentices = Object.entries(myWorkers).filter(
    ([id, loc]) => id.startsWith("apprentice") && loc != null,
  ).length;
  const masterPlaced =
    (myWorkers["master-p1"] ?? myWorkers["master-p2"]) != null;
  return (
    <section
      aria-label="Workers"
      className={`${PANEL_CLASS} flex flex-col gap-2`}
    >
      <h2 className={SECTION_HEADING_CLASS}>Workers</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">Apprentices:</span>
        <span className="tabular-nums">
          {cap - placedApprentices} / {cap} available
        </span>
        {pending > 0 ? (
          <span className="text-[11px] font-bold text-[#2d5da1]">
            +{pending} pending
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">Master:</span>
        <span>{masterPlaced ? "placed" : "available"}</span>
      </div>
    </section>
  );
}

export function HandPanel({
  orderHand,
  apprenticeHand,
}: {
  orderHand: HandSurface;
  apprenticeHand: HandSurface;
}) {
  return (
    <section
      aria-label="Your hand"
      className={`${PANEL_CLASS} flex flex-col gap-3`}
    >
      <h2 className={SECTION_HEADING_CLASS}>Your hand</h2>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Order cards
        </div>
        <orderHand.Hand empty={<EmptyHandLabel label="no orders" />}>
          <orderHand.Cards>
            {(card) => (
              <orderHand.Card key={card.id} card={card}>
                <CardChip cardId={card.id} />
              </orderHand.Card>
            )}
          </orderHand.Cards>
        </orderHand.Hand>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Apprentice cards
        </div>
        <apprenticeHand.Hand empty={<EmptyHandLabel label="no apprentices" />}>
          <apprenticeHand.Cards>
            {(card) => (
              <apprenticeHand.Card key={card.id} card={card}>
                <CardChip cardId={card.id} tone="apprentice" />
              </apprenticeHand.Card>
            )}
          </apprenticeHand.Cards>
        </apprenticeHand.Hand>
      </div>
    </section>
  );
}

function EmptyHandLabel({ label }: { label: string }) {
  return <span className="text-xs text-slate-400">{label}</span>;
}

function CardChip({
  cardId,
  tone = "order",
}: {
  cardId: string;
  tone?: "order" | "apprentice";
}) {
  const base =
    tone === "order"
      ? "bg-[#fdfbf7] text-[#2d2d2d]"
      : "bg-[#e5e0d8] text-[#2d2d2d]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border-2 border-[#2d2d2d] px-2 py-1 text-xs font-bold shadow-[2px_2px_0_#2d2d2d] ${base}`}
      title={cardId}
    >
      <PackageOpen className="h-3 w-3" strokeWidth={2.5} />
      {cardId}
    </span>
  );
}

export function TableauPanel({ view }: { view: GameView }) {
  const entries = Object.entries(
    view.playedPersistentApprenticesByPlayer,
  ) as Array<[PlayerId, readonly CardId[]]>;
  const anyPlayed = entries.some(([, cards]) => cards.length > 0);
  if (!anyPlayed) return null;
  return (
    <section
      aria-label="Tableau"
      className={`${PANEL_CLASS} flex flex-col gap-2`}
    >
      <h2 className={SECTION_HEADING_CLASS}>Persistent tableau</h2>
      <div className="flex flex-col gap-2">
        {entries.map(([pid, cards]) =>
          cards.length > 0 ? (
            <div key={pid} className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {pid}
              </span>
              {cards.map((cardId) => (
                <CardChip key={cardId} cardId={cardId} tone="apprentice" />
              ))}
            </div>
          ) : null,
        )}
      </div>
    </section>
  );
}

export function ScoreBoard({ view }: { view: GameView }) {
  const finalVP = view.finalVPByPlayerId;
  const running = view.playerVP;
  const players = view.turnOrderThisSeason;
  const scores = finalVP ?? running;
  const winningPlayerId = view.outcome?.standings.find(
    (standing) => standing.result === "win",
  )?.playerId;
  return (
    <section
      aria-label="Scores"
      className={`${PANEL_CLASS} flex flex-col gap-2`}
    >
      <h2 className={SECTION_HEADING_CLASS}>
        {finalVP ? "Final scores" : "Scores"}
      </h2>
      <ul className="flex flex-col gap-1">
        {players.map((pid) => {
          const isWinner = winningPlayerId === pid;
          return (
            <li
              key={pid}
              className={`flex items-center justify-between rounded-md border-2 border-[#2d2d2d] px-2 py-1 text-sm ${
                isWinner
                  ? "bg-[#fff9c4] shadow-[2px_2px_0_#2d2d2d]"
                  : "bg-[#fdfbf7]"
              }`}
            >
              <span className="font-bold">
                {pid}
                {isWinner ? " winner" : ""}
              </span>
              <span className="tabular-nums font-bold">
                {scores[pid] ?? 0} VP
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

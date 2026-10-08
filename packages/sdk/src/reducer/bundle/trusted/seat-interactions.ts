import { isBoardSpaceTarget } from "../../../shared/board-target.js";
import { inputValueInDomain } from "../../../shared/input-domain.js";
import { isPositionTarget } from "../../../shared/position-target.js";
import type {
  InputCollector,
  InputDomainDescriptor,
} from "../../model/spec/inputs.js";
import type { CardConcealment } from "./card-concealment.js";
import type { SeatDisclosure } from "./tile-disclosure.js";
import type {
  InteractionDescriptorShape,
  InteractionInputDescriptorShape,
} from "./interaction-types.js";

type Collectors = Readonly<Record<string, InputCollector>>;
type ReferenceMapper = (value: unknown) => unknown;
const denied = Symbol("unauthorized component reference");

/** Map one declared scalar or flat many field; never inspect arbitrary game data. */
function mapSelection(
  value: unknown,
  many: boolean,
  map: ReferenceMapper,
): unknown {
  if (!many) return map(value);
  if (!Array.isArray(value)) return denied;
  const mapped = value.map(map);
  return mapped.includes(denied) ? denied : mapped;
}

function cardReference(
  id: unknown,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
  decode: boolean,
): unknown {
  if (typeof id !== "string") return denied;
  const cardId = decode ? cards.tableCardId(id) : id;
  if (
    cardId === null ||
    !cards.canTarget(cardId) ||
    !disclosure.locationAccess(cardId).inventory
  )
    return denied;
  return decode ? cardId : cards.seatCardId(cardId);
}

function boardReference(
  value: unknown,
  domain: Extract<InputDomainDescriptor, { type: "boardTarget" }>,
  disclosure: SeatDisclosure,
  decode: boolean,
): unknown {
  const map = decode
    ? disclosure.authoritativeBoardTarget
    : disclosure.boardTarget;
  if (domain.valueKind === "board-space") {
    if (!isBoardSpaceTarget(value)) return denied;
    const spaceId = map("space", value.boardId, value.spaceId);
    return spaceId === null ? denied : { boardId: value.boardId, spaceId };
  }
  if (typeof value !== "string") return denied;
  return map(domain.targetKind, domain.boardId, value) ?? denied;
}

function zoneHostReference(
  zoneId: string,
  hostId: string,
  disclosure: SeatDisclosure,
  decode: boolean,
): string | null {
  const zone = disclosure.zones.find(
    (zone) =>
      zone.zoneId === zoneId &&
      (decode ? zone.seatHostId : zone.hostId) === hostId,
  );
  return zone ? (decode ? zone.hostId : zone.seatHostId) : null;
}

function positionReference(
  value: unknown,
  disclosure: SeatDisclosure,
  decode: boolean,
): unknown {
  if (!isPositionTarget(value)) return denied;
  const hostId = zoneHostReference(
    value.zoneId,
    value.hostId,
    disclosure,
    decode,
  );
  return hostId === null ? denied : { ...value, hostId };
}

function domainMapper(
  domain: InputDomainDescriptor,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
  decode: boolean,
): ReferenceMapper | undefined {
  switch (domain.type) {
    case "tileTarget":
      return (value) =>
        typeof value === "string"
          ? ((decode ? disclosure.tileId(value) : disclosure.tileRef(value)) ??
            denied)
          : denied;
    case "cardTarget":
      return (value) => cardReference(value, disclosure, cards, decode);
    case "boardTarget":
      return (value) => boardReference(value, domain, disclosure, decode);
    case "zonePosition":
      return (value) => positionReference(value, disclosure, decode);
    default:
      return undefined;
  }
}

/** Collector metadata describes reference positions even for earlier selected steps. */
function collectorMapper(
  collector: InputCollector,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
  decode: boolean,
): ReferenceMapper | undefined {
  switch (collector.kind) {
    case "position":
      return (value) => positionReference(value, disclosure, decode);
    case "tile":
      return (value) =>
        typeof value === "string"
          ? ((decode ? disclosure.tileId(value) : disclosure.tileRef(value)) ??
            denied)
          : denied;
    case "card":
      return (value) => cardReference(value, disclosure, cards, decode);
    case "board-space":
    case "board-edge":
    case "board-vertex": {
      const meta = collector.meta;
      const domain =
        meta.valueKind === "board-space"
          ? {
              type: "boardTarget" as const,
              projection: "resolved" as const,
              targetKind: "space" as const,
              valueKind: "board-space" as const,
              boardBaseId: meta.boardBaseId,
              eligibleTargets: [],
            }
          : {
              type: "boardTarget" as const,
              projection: "resolved" as const,
              targetKind: meta.targetKind,
              valueKind: "board-id" as const,
              boardId: meta.boardId,
              eligibleTargets: [],
            };
      return (value) => boardReference(value, domain, disclosure, decode);
    }
    default:
      return undefined;
  }
}

/** An identity-specific default would track a concealed component across hidden reorder. */
function defaultMapper(
  domain: InputDomainDescriptor,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
  map: ReferenceMapper,
): ReferenceMapper {
  if (domain.type === "tileTarget")
    return (value) =>
      typeof value === "string" &&
      disclosure.tile(value)?.disclosure === "visible"
        ? map(value)
        : denied;
  if (domain.type === "cardTarget")
    return (value) =>
      typeof value === "string" && !cards.isHidden(value) ? map(value) : denied;
  return map;
}

function projectInput(
  input: InteractionInputDescriptorShape,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
): InteractionInputDescriptorShape {
  const map = domainMapper(input.domain, disclosure, cards, false);
  if (!map) return input;
  const domain = input.domain;
  if (
    domain.type !== "tileTarget" &&
    domain.type !== "cardTarget" &&
    domain.type !== "boardTarget" &&
    domain.type !== "zonePosition"
  )
    return input;
  // The domain discriminator and mapper preserve the domain's scalar/object representation.
  const projectedDomain = (
    domain.type === "zonePosition"
      ? {
          ...domain,
          zones: domain.zones.flatMap((zone) => {
            const hostId = zoneHostReference(
              zone.zoneId,
              zone.hostId,
              disclosure,
              false,
            );
            return hostId === null ? [] : [{ ...zone, hostId }];
          }),
        }
      : {
          ...domain,
          eligibleTargets: domain.eligibleTargets.flatMap((value) => {
            const mapped = map(value);
            return mapped === denied ? [] : [mapped];
          }),
        }
  ) as InputDomainDescriptor;
  const { defaultValue, ...rest } = input;
  const mappedDefault =
    defaultValue === undefined
      ? denied
      : mapSelection(
          defaultValue,
          domain.selection?.mode === "many",
          defaultMapper(domain, disclosure, cards, map),
        );
  return {
    ...rest,
    domain: projectedDomain,
    ...(mappedDefault !== denied &&
    inputValueInDomain(projectedDomain, mappedDefault, domain.selection)
      ? { defaultValue: mappedDefault }
      : {}),
  };
}

/** Project targets, defaults and drafts through the same seat reference authority. */
export function projectSeatDescriptor(
  descriptor: InteractionDescriptorShape,
  collectors: Collectors,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
): InteractionDescriptorShape | null {
  let selected: Record<string, unknown> | undefined;
  if (descriptor.step) {
    selected = {};
    for (const [key, value] of Object.entries(descriptor.step.selected)) {
      const collector = collectors[key];
      if (!collector) return null;
      const map = collectorMapper(collector, disclosure, cards, false);
      const mapped = map
        ? mapSelection(value, collector.selection?.mode === "many", map)
        : value;
      if (mapped === denied) return null;
      selected[key] = mapped;
    }
  }
  return {
    ...descriptor,
    inputs: descriptor.inputs.map((input) =>
      projectInput(input, disclosure, cards),
    ),
    ...(descriptor.step && selected
      ? { step: { ...descriptor.step, selected } }
      : {}),
  };
}

/** Resolve only declared reference fields before the authoritative parameter schema runs. */
export function decodeSeatParams(
  params: Readonly<Record<string, unknown>>,
  collectors: Collectors,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
): Record<string, unknown> | null {
  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const collector = collectors[key];
    const map =
      collector && collectorMapper(collector, disclosure, cards, true);
    const mapped = map
      ? mapSelection(value, collector.selection?.mode === "many", map)
      : value;
    if (mapped === denied) return null;
    decoded[key] = mapped;
  }
  return decoded;
}

/** Full-knowledge test adapter only: invalid references stay invalid for normal ingress rejection. */
export function encodeSeatParams(
  params: Readonly<Record<string, unknown>>,
  collectors: Collectors,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      const collector = collectors[key];
      const map =
        collector && collectorMapper(collector, disclosure, cards, false);
      if (!map) return [key, value];
      const mapped = mapSelection(
        value,
        collector.selection?.mode === "many",
        (item) => {
          const result = map(item);
          return result === denied ? item : result;
        },
      );
      return [key, mapped === denied ? value : mapped];
    }),
  );
}

/** Pending selection admission uses the same declared reference positions as projection. */
export function canDiscloseSelection(
  params: Readonly<Record<string, unknown>>,
  collectors: Collectors,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
): boolean {
  return Object.entries(params).every(([key, value]) => {
    const collector = collectors[key];
    if (!collector) return false;
    const map = collectorMapper(collector, disclosure, cards, false);
    return (
      !map ||
      mapSelection(value, collector.selection?.mode === "many", map) !== denied
    );
  });
}

/** A concealed draft cannot carry its authoritative identity into another reference basis. */
export function selectionHasConcealedReferences(
  params: Readonly<Record<string, unknown>>,
  collectors: Collectors,
  disclosure: SeatDisclosure,
  cards: CardConcealment,
): boolean {
  return Object.entries(params).some(([key, value]) => {
    const collector = collectors[key];
    if (!collector || (collector.kind !== "tile" && collector.kind !== "card"))
      return false;
    let concealed = false;
    mapSelection(value, collector.selection?.mode === "many", (id) => {
      if (
        typeof id === "string" &&
        (collector.kind === "tile"
          ? disclosure.tile(id)?.disclosure === "concealed"
          : cards.isHidden(id))
      )
        concealed = true;
      return id;
    });
    return concealed;
  });
}

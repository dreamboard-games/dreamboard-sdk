import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import {
  Interaction,
  Zone,
  renderPrimitive,
  useInteractionPrimitiveContext,
  useZonePrimitiveContext,
  type InteractionRootProps,
  type PrimitiveCommonProps,
} from "../primitives/index.js";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
} from "../types/plugin-state.js";
import type {
  InteractionInputKey,
  InteractionKey,
  ZoneKey,
} from "../ui-contract.js";
import { useSeatInbox } from "../hooks/useSeatInbox.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";

type LayoutPrimitiveProps = PrimitiveCommonProps & HTMLAttributes<HTMLElement>;

function layoutStyle(
  base: CSSProperties,
  style: CSSProperties | undefined,
): CSSProperties {
  return style ? { ...base, ...style } : base;
}

export function GameLayoutRoot({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("div", {
    ...props,
    "data-dreamboard-game-layout": "",
    style: layoutStyle(
      {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 24rem)",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateAreas: `"header header" "board sidebar" "bottom sidebar"`,
        minHeight: "100%",
        gap: "1rem",
      },
      style,
    ),
    children,
  });
}

export function GameLayoutHeader({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("header", {
    ...props,
    "data-dreamboard-game-layout-header": "",
    style: layoutStyle({ gridArea: "header" }, style),
    children,
  });
}

export function GameLayoutBoard({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("section", {
    ...props,
    "data-dreamboard-game-layout-board": "",
    style: layoutStyle({ gridArea: "board", minWidth: 0 }, style),
    children,
  });
}

export function GameLayoutSidebar({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("aside", {
    ...props,
    "data-dreamboard-game-layout-sidebar": "",
    style: layoutStyle(
      {
        gridArea: "sidebar",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      },
      style,
    ),
    children,
  });
}

export function GameLayoutBottom({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("section", {
    ...props,
    "data-dreamboard-game-layout-bottom": "",
    style: layoutStyle({ gridArea: "bottom", minWidth: 0 }, style),
    children,
  });
}

export const GameLayout = {
  Root: GameLayoutRoot,
  Header: GameLayoutHeader,
  Board: GameLayoutBoard,
  Sidebar: GameLayoutSidebar,
  Bottom: GameLayoutBottom,
};

export interface DefaultInteractionListProps extends PrimitiveCommonProps {
  empty?: ReactNode;
  includeUnavailable?: boolean;
  renderInteraction?: (interaction: InteractionDescriptor) => ReactNode;
}

export function DefaultInteractionList({
  empty = null,
  includeUnavailable = false,
  renderInteraction,
  ...props
}: DefaultInteractionListProps) {
  const inbox = useSeatInbox();
  const interactions = (inbox.bySurface.panel ?? []).filter(
    (descriptor) => includeUnavailable || isInteractionAvailable(descriptor),
  );
  if (interactions.length === 0) return <>{empty}</>;

  return renderPrimitive("section", {
    ...props,
    "data-dreamboard-default-interaction-list": "",
    children: interactions.map((descriptor) =>
      renderInteraction ? (
        renderInteraction(descriptor)
      ) : (
        <DefaultInteractionItem
          key={descriptor.interactionKey}
          interaction={descriptor.interactionKey}
        />
      ),
    ),
  });
}

export type DefaultInteractionItemProps<
  InteractionKeyValue extends string = InteractionKey,
> = Omit<InteractionRootProps<InteractionKeyValue>, "children"> &
  PrimitiveCommonProps;

export function DefaultInteractionItem<
  InteractionKeyValue extends string = InteractionKey,
>({
  interaction,
  unavailable,
  ...props
}: DefaultInteractionItemProps<InteractionKeyValue>) {
  return (
    <Interaction.Root interaction={interaction} unavailable={unavailable}>
      {renderPrimitive("article", {
        ...props,
        "data-dreamboard-default-interaction-item": "",
        children: (
          <>
            <Interaction.Label />
            <Interaction.UnavailableMessage />
            <DefaultInteractionForm />
          </>
        ),
      })}
    </Interaction.Root>
  );
}

export interface DefaultInteractionFormProps extends PrimitiveCommonProps {
  submitLabel?: ReactNode;
  renderField?: (input: InteractionInputDescriptor) => ReactNode;
}

export function DefaultInteractionForm({
  submitLabel = "Submit",
  renderField,
  ...props
}: DefaultInteractionFormProps) {
  const { descriptor } = useInteractionPrimitiveContext();
  const fields = descriptor?.inputs ?? [];
  return renderPrimitive("div", {
    ...props,
    "data-dreamboard-default-interaction-form": "",
    children: (
      <>
        {fields.map((input) =>
          renderField ? (
            renderField(input)
          ) : (
            <DefaultInteractionField key={input.key} input={input} />
          ),
        )}
        <Interaction.ValidationMessage />
        <Interaction.Submit>{submitLabel}</Interaction.Submit>
      </>
    ),
  });
}

function DefaultInteractionField({
  input,
}: {
  input: InteractionInputDescriptor;
}) {
  if (input.domain.type === "choice") {
    return <DefaultChoiceField input={input} />;
  }
  if (input.domain.type === "boundedNumber") {
    return (
      <label data-dreamboard-default-interaction-field="">
        {input.key}
        <Interaction.Input
          name={input.key}
          type="number"
          min={input.domain.min}
          max={input.domain.max}
          step={input.domain.step}
          parse={(value) => Number(value)}
        />
      </label>
    );
  }
  return (
    <label data-dreamboard-default-interaction-field="">
      {input.key}
      <Interaction.Input name={input.key} />
    </label>
  );
}

function DefaultChoiceField({ input }: { input: InteractionInputDescriptor }) {
  const { handle } = useInteractionPrimitiveContext();
  const value = handle?.draft[input.key] ?? handle?.values[input.key];
  const encodeValue = (candidate: unknown) =>
    candidate === null ? "__dreamboard_null_choice__" : String(candidate);
  return (
    <label data-dreamboard-default-interaction-field="">
      {input.key}
      <select
        name={input.key}
        value={value === undefined ? "" : encodeValue(value)}
        data-dreamboard-default-choice-input=""
        disabled={!handle?.available}
        onChange={(event) =>
          handle?.setInput(
            input.key,
            event.currentTarget.value === "__dreamboard_null_choice__"
              ? null
              : event.currentTarget.value,
          )
        }
      >
        <option value="" />
        {(input.domain.type === "choice"
          ? (input.domain.choices ?? [])
          : []
        ).map((choice) => (
          <option
            key={encodeValue(choice.value)}
            value={encodeValue(choice.value)}
            disabled={choice.disabled}
          >
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface DefaultZoneProps<ZoneValue extends string = ZoneKey>
  extends PrimitiveCommonProps {
  zone: ZoneValue;
  empty?: ReactNode;
  layout?: "row" | "column" | "grid" | "fan";
  interaction?: InteractionKey;
  input?: InteractionInputKey;
  renderCard?: (card: DefaultZoneCard) => ReactNode;
}

export interface DefaultZoneCard {
  id: string;
  serialized: string;
  data: unknown;
}

export function DefaultZone<ZoneValue extends string = ZoneKey>({
  zone,
  empty = null,
  layout = "row",
  interaction,
  input,
  renderCard,
  ...props
}: DefaultZoneProps<ZoneValue>) {
  const content = (
    <Zone.Root zone={zone}>
      <DefaultZoneList
        empty={empty}
        input={input}
        layout={layout}
        renderCard={renderCard}
        {...props}
      />
    </Zone.Root>
  );

  return interaction ? (
    <Interaction.Root interaction={interaction}>{content}</Interaction.Root>
  ) : (
    content
  );
}

function DefaultZoneList({
  empty,
  input,
  layout = "row",
  renderCard,
  style,
  ...props
}: Omit<DefaultZoneProps<string>, "zone" | "interaction">) {
  const { snapshot } = useZonePrimitiveContext();
  const cardIds = snapshot?.cardIds ?? [];
  if (cardIds.length === 0) return <>{empty}</>;

  return (
    <Zone.List
      {...props}
      data-dreamboard-default-zone=""
      data-layout={layout}
      style={layoutStyle(defaultZoneLayoutStyle(layout), style)}
    >
      {cardIds.map((cardId) => {
        const serialized = snapshot?.cardViewsById[cardId] ?? "";
        const card: DefaultZoneCard = {
          id: cardId,
          serialized,
          data: parseCardData(serialized),
        };
        const body = renderCard ? renderCard(card) : card.id;
        return (
          <Zone.Item key={cardId} card={cardId}>
            {input ? (
              <Interaction.CardInput input={input}>
                {body}
              </Interaction.CardInput>
            ) : (
              body
            )}
          </Zone.Item>
        );
      })}
    </Zone.List>
  );
}

function defaultZoneLayoutStyle(
  layout: NonNullable<DefaultZoneProps["layout"]>,
): CSSProperties {
  if (layout === "grid") {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(5rem, 1fr))",
      gap: "0.5rem",
    };
  }
  return {
    display: "flex",
    flexDirection: layout === "column" ? "column" : "row",
    flexWrap: layout === "fan" ? "nowrap" : "wrap",
    gap: "0.5rem",
  };
}

function parseCardData(serialized: string): unknown {
  if (!serialized) return null;
  try {
    return JSON.parse(serialized);
  } catch {
    return serialized;
  }
}

export type DefaultChoiceInputProps = SelectHTMLAttributes<HTMLSelectElement>;

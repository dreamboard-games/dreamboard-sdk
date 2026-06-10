import {
  cloneElement,
  isValidElement,
  type AriaAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type JSX,
  type ChangeEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

export type PrimitiveDataAttributes = Record<
  `data-${string}`,
  string | boolean | number | undefined
>;

export type PrimitiveCommonProps = {
  asChild?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
} & AriaAttributes &
  PrimitiveDataAttributes;

type EventHandler<Event> = (event: Event) => void;

export function composeEventHandlers<
  Event extends { defaultPrevented: boolean },
>(
  authorHandler: EventHandler<Event> | undefined,
  primitiveHandler: EventHandler<Event> | undefined,
): EventHandler<Event> | undefined {
  if (!authorHandler) return primitiveHandler;
  if (!primitiveHandler) return authorHandler;
  return (event) => {
    authorHandler(event);
    if (!event.defaultPrevented) {
      primitiveHandler(event);
    }
  };
}

export function renderPrimitive<
  ElementProps extends HTMLAttributes<HTMLElement>,
>(
  tagName: keyof JSX.IntrinsicElements,
  props: ElementProps & PrimitiveCommonProps,
): ReactElement {
  const { asChild, children, ...primitiveProps } = props;
  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error(
        "asChild requires exactly one valid React element child.",
      );
    }
    const element = children as ReactElement<HTMLAttributes<HTMLElement>>;
    const childProps = element.props;
    return cloneElement(element, {
      ...primitiveProps,
      ...childProps,
      className: [primitiveProps.className, childProps.className]
        .filter(Boolean)
        .join(" "),
      style: {
        ...(primitiveProps.style ?? {}),
        ...(childProps.style ?? {}),
      },
      onClick: composeEventHandlers(
        childProps.onClick,
        primitiveProps.onClick as EventHandler<MouseEvent<HTMLElement>>,
      ),
      onPointerDown: composeEventHandlers(
        childProps.onPointerDown,
        primitiveProps.onPointerDown as EventHandler<PointerEvent<HTMLElement>>,
      ),
      onPointerMove: composeEventHandlers(
        childProps.onPointerMove,
        primitiveProps.onPointerMove as EventHandler<PointerEvent<HTMLElement>>,
      ),
      onPointerUp: composeEventHandlers(
        childProps.onPointerUp,
        primitiveProps.onPointerUp as EventHandler<PointerEvent<HTMLElement>>,
      ),
      onPointerCancel: composeEventHandlers(
        childProps.onPointerCancel,
        primitiveProps.onPointerCancel as EventHandler<
          PointerEvent<HTMLElement>
        >,
      ),
      onChange: composeEventHandlers(
        childProps.onChange,
        primitiveProps.onChange as EventHandler<ChangeEvent<HTMLElement>>,
      ),
    });
  }
  const Tag = tagName as keyof JSX.IntrinsicElements;
  return <Tag {...(primitiveProps as object)}>{children}</Tag>;
}

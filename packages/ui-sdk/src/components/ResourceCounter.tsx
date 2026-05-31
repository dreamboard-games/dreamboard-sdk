import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ComponentType,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../primitives/primitive-props.js";

export type ResourceId = string;

export interface ResourceDisplayConfig<Resource extends string = ResourceId> {
  type: Resource;
  label: string;
  icon:
    | ReactNode
    | ComponentType<{
        className?: string;
        strokeWidth?: number;
        "aria-hidden"?: boolean | "true" | "false";
      }>;
  iconColor?: string;
  bgColor?: string;
  textColor?: string;
}

export interface ResourceCounterItemState<
  Resource extends string = ResourceId,
> {
  type: Resource;
  label: string;
  icon: ResourceDisplayConfig<Resource>["icon"];
  iconColor?: string;
  bgColor?: string;
  textColor?: string;
  count: number;
  isZero: boolean;
  interactive: boolean;
  select: () => void;
  renderIcon: (props?: ResourceIconProps) => ReactNode;
  dataAttributes: {
    "data-resource-id": Resource;
    "data-resource-count": number;
    "data-resource-zero": boolean | undefined;
    "data-interactive": boolean | undefined;
  };
}

export interface ResourceIconProps {
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}

export type ResourceCounterRootProps<Resource extends string = ResourceId> =
  Omit<PrimitiveCommonProps, "children"> &
    Omit<HTMLAttributes<HTMLElement>, "children"> & {
      resources: ReadonlyArray<ResourceDisplayConfig<Resource>>;
      counts: Partial<Record<Resource, number>>;
      zero?: "show" | "hide";
      onResourceClick?: (resourceType: Resource) => void;
      children: ReactNode;
    };

export type BoundResourceCounterRootProps<
  Resource extends string = ResourceId,
> = Omit<ResourceCounterRootProps<Resource>, "resources">;

export type ResourceCounterProps<Resource extends string = ResourceId> =
  ResourceCounterRootProps<Resource>;

export type ResourceCounterPartProps<Resource extends string = ResourceId> =
  Omit<PrimitiveCommonProps, "children"> &
    Omit<HTMLAttributes<HTMLElement>, "children"> & {
      children?:
        | ReactNode
        | ((resource: ResourceCounterItemState<Resource>) => ReactNode);
    };

const ResourceCounterItemContext =
  createContext<ResourceCounterItemState<string> | null>(null);

function useResourceCounterItemContext<Resource extends string>() {
  const value = useContext(ResourceCounterItemContext);
  if (!value) {
    throw new Error(
      "ResourceCounter item primitives must be rendered inside <ResourceCounter.Item>.",
    );
  }
  return value as ResourceCounterItemState<Resource>;
}

function renderResourceIcon(
  icon: ResourceDisplayConfig<string>["icon"],
  props: ResourceIconProps = {},
) {
  if (typeof icon === "function") {
    return createElement(icon, {
      "aria-hidden": true,
      strokeWidth: 2.5,
      ...props,
    });
  }
  const {
    strokeWidth: _strokeWidth,
    "aria-hidden": ariaHidden,
    ...spanProps
  } = props;
  return (
    <span
      aria-hidden={ariaHidden === undefined ? true : ariaHidden !== "false"}
      {...spanProps}
    >
      {icon}
    </span>
  );
}

function resolveResourceChildren<Resource extends string>(
  children: ResourceCounterPartProps<Resource>["children"],
  resource: ResourceCounterItemState<Resource>,
) {
  return typeof children === "function" ? children(resource) : children;
}

export function ResourceCounterRoot<Resource extends string = ResourceId>({
  resources,
  counts,
  zero = "show",
  onResourceClick,
  children,
  "aria-label": ariaLabel,
  ...props
}: ResourceCounterRootProps<Resource>) {
  const items = useMemo(
    () =>
      resources
        .map((resource) => {
          const count = counts[resource.type] ?? 0;
          return {
            ...resource,
            count,
            isZero: count === 0,
            interactive: Boolean(onResourceClick),
            select: () => onResourceClick?.(resource.type),
            renderIcon: (iconProps) =>
              renderResourceIcon(resource.icon, iconProps),
            dataAttributes: {
              "data-resource-id": resource.type,
              "data-resource-count": count,
              "data-resource-zero": count === 0 || undefined,
              "data-interactive": onResourceClick ? true : undefined,
            },
          } satisfies ResourceCounterItemState<Resource>;
        })
        .filter((resource) => zero === "show" || !resource.isZero),
    [counts, onResourceClick, resources, zero],
  );

  return renderPrimitive("div", {
    role: "list",
    "aria-label": ariaLabel ?? "Resource counts",
    "data-dreamboard-resource-counter": "",
    ...props,
    children: items.map((resource) => (
      <ResourceCounterItemContext.Provider key={resource.type} value={resource}>
        {children}
      </ResourceCounterItemContext.Provider>
    )),
  });
}

export function ResourceCounterItem<Resource extends string = ResourceId>({
  children,
  onClick,
  "aria-label": ariaLabel,
  ...props
}: ResourceCounterPartProps<Resource>) {
  const resource = useResourceCounterItemContext<Resource>();
  return renderPrimitive("span", {
    role: "listitem",
    "aria-label": ariaLabel ?? `${resource.label}: ${resource.count}`,
    ...resource.dataAttributes,
    ...props,
    onClick: composeEventHandlers(
      onClick,
      resource.interactive ? resource.select : undefined,
    ),
    children: resolveResourceChildren(children, resource),
  });
}

export function ResourceCounterIcon<Resource extends string = ResourceId>({
  className,
  strokeWidth,
  "aria-hidden": ariaHidden,
}: ResourceIconProps): ReactNode {
  const resource = useResourceCounterItemContext<Resource>();
  return resource.renderIcon({
    className,
    strokeWidth,
    "aria-hidden": ariaHidden,
  });
}

export function ResourceCounterCount<Resource extends string = ResourceId>({
  children,
  ...props
}: ResourceCounterPartProps<Resource>) {
  const resource = useResourceCounterItemContext<Resource>();
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-resource-count": "",
    children: resolveResourceChildren(children ?? resource.count, resource),
  });
}

export function ResourceCounterLabel<Resource extends string = ResourceId>({
  children,
  ...props
}: ResourceCounterPartProps<Resource>) {
  const resource = useResourceCounterItemContext<Resource>();
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-resource-label": "",
    children: resolveResourceChildren(children ?? resource.label, resource),
  });
}

export interface ResourceCounterComponents<
  Resource extends string = ResourceId,
> {
  Root(props: BoundResourceCounterRootProps<Resource>): ReactElement;
  Item(props: ResourceCounterPartProps<Resource>): ReactElement;
  Icon(props: ResourceIconProps): ReactNode;
  Count(props: ResourceCounterPartProps<Resource>): ReactElement;
  Label(props: ResourceCounterPartProps<Resource>): ReactElement;
}

export function createResourceCounter<Resource extends string>(
  resources: ReadonlyArray<ResourceDisplayConfig<Resource>>,
): ResourceCounterComponents<Resource> {
  return {
    Root(props) {
      return createElement(ResourceCounterRoot<Resource>, {
        ...props,
        resources,
      });
    },
    Item: ResourceCounterItem,
    Icon: ResourceCounterIcon,
    Count: ResourceCounterCount,
    Label: ResourceCounterLabel,
  } satisfies ResourceCounterComponents<Resource>;
}

export const ResourceCounter = {
  Root: ResourceCounterRoot,
  Item: ResourceCounterItem,
  Icon: ResourceCounterIcon,
  Count: ResourceCounterCount,
  Label: ResourceCounterLabel,
};

import { cn } from "cn";
import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type ResourceDisplay = {
  id: string;
  label: string;
  count: number;
  icon?: ReactNode;
};
export type ResourcesProps = ComponentProps<"dl"> & {
  resources: readonly ResourceDisplay[];
};
export function Resources({
  resources,
  className = "",
  ...props
}: ResourcesProps) {
  return (
    <dl
      {...props}
      className={cn("db-resources m-0 flex flex-wrap gap-2", className)}
    >
      {resources.map((resource) => (
        <div
          className="flex items-baseline gap-4 rounded-md bg-muted px-3 py-2"
          key={resource.id}
          data-resource-id={resource.id}
        >
          <dt className="text-sm">
            <span aria-hidden="true">{resource.icon}</span> {resource.label}
          </dt>
          <dd className="m-0 font-semibold tabular-nums">{resource.count}</dd>
        </div>
      ))}
    </dl>
  );
}

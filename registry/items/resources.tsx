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
    <dl {...props} className={`db-resources ${className}`}>
      {resources.map((resource) => (
        <div key={resource.id} data-resource-id={resource.id}>
          <dt>
            <span aria-hidden="true">{resource.icon}</span> {resource.label}
          </dt>
          <dd>{resource.count}</dd>
        </div>
      ))}
    </dl>
  );
}

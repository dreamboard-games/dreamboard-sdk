import React from "react";

export function JsonPanel({
  title,
  value,
}: {
  readonly title: string;
  readonly value: unknown;
}) {
  return (
    <section className="inspector-panel">
      <h2>{title}</h2>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}

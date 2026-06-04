import type { z } from "zod";
import type { InputCollector } from "../model/spec";
import type { SchemaLike } from "../model/table";

export type InputFieldRef<
  Key extends string = string,
  Value = unknown,
  Collector extends InputCollector = InputCollector,
> = {
  readonly key: Key;
  readonly collector: Collector;
  readonly __value?: Value;
};

type RefValue<Ref> =
  Ref extends InputFieldRef<string, infer Value, InputCollector>
    ? Value
    : never;

type CollectorOfRef<Ref> =
  Ref extends InputFieldRef<string, unknown, infer Collector>
    ? Collector
    : never;

type CollectorValue<Collector> =
  Collector extends InputCollector<infer Schema> ? z.infer<Schema> : never;

export type DependencyValues<
  Dependencies extends readonly InputFieldRef<
    string,
    unknown,
    InputCollector
  >[],
> = {
  readonly [Ref in Dependencies[number] as Ref["key"]]: RefValue<Ref>;
};

type DefinedInputRefs = Record<
  string,
  InputFieldRef<string, unknown, InputCollector>
>;

export type DefinedInputs<Refs extends DefinedInputRefs> = {
  readonly [Key in keyof Refs]: CollectorOfRef<Refs[Key]>;
};

class InputBuilder {
  add<
    const Key extends string,
    Collector extends InputCollector<SchemaLike<unknown>>,
  >(
    key: Key,
    collector: Collector,
  ): InputFieldRef<Key, CollectorValue<Collector>, Collector> {
    return { key, collector };
  }
}

/**
 * Define an interaction's inputs with typed field references. Field refs can be
 * passed to dependent input domains, and the returned collector map preserves
 * the original key/value types for interaction params.
 */
export function defineInputs<const Refs extends DefinedInputRefs>(
  define: (input: InputBuilder) => Refs,
): DefinedInputs<Refs> {
  const refs = define(new InputBuilder());
  return Object.fromEntries(
    Object.entries(refs).map(([key, ref]) => [key, ref.collector]),
  ) as DefinedInputs<Refs>;
}

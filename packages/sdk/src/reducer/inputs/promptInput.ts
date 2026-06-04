import type { SchemaLike } from "../model/table";
import type { CollectorState, InputCollector } from "../model/spec";
import type { ChoiceTargetRule } from "./choiceTarget";
import type { z } from "zod";

type SchemaStringValue<Schema extends SchemaLike<unknown>> = Extract<
  Schema extends z.ZodType<infer V> ? V : never,
  string
>;

/**
 * `promptInput` marks an interaction as a prompt delivered to a player's
 * inbox. The submitted value is validated by the supplied Zod schema.
 *
 * Static or free-form prompts need only `schema`. Finite dynamic choices use
 * a built `choiceTarget.options(...).build()` rule so projected options and
 * submit validation share one source of truth.
 */
export function promptInput<
  Schema extends SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
>(options: {
  schema: Schema;
  target?: ChoiceTargetRule<State, SchemaStringValue<Schema>>;
}): InputCollector<Schema, State, "prompt"> {
  const target = options.target;
  return {
    kind: "prompt",
    schema: options.schema,
    eligibleTargets: target
      ? (((state, playerId, q) =>
          target.eligible({
            state: state as State,
            playerId: playerId as never,
            q: q as never,
          })) as
          | ((
              state: CollectorState,
              playerId: string,
              q: unknown,
            ) => ReadonlyArray<unknown>)
          | undefined)
      : undefined,
    validateTarget: target
      ? (((state, playerId, q, targetId) =>
          target.validate(
            {
              state: state as State,
              playerId: playerId as never,
              q: q as never,
            },
            targetId as SchemaStringValue<Schema>,
          )) as InputCollector<Schema, State, "prompt">["validateTarget"])
      : undefined,
    meta: target
      ? {
          options: (state: unknown, playerId: unknown, q: unknown) =>
            target.options({
              state: state as State,
              playerId: playerId as never,
              q: q as never,
            }),
          eligibleOptions: (state: unknown, playerId: unknown, q: unknown) =>
            target.eligibleOptions({
              state: state as State,
              playerId: playerId as never,
              q: q as never,
            }),
        }
      : undefined,
    domain: (state, playerId, q) => ({
      type: "choice" as const,
      choices: target
        ? target
            .options({
              state: state as State,
              playerId: playerId as never,
              q: q as never,
            })
            .map((option) => ({
              value: String(option.id),
              label: option.label ?? String(option.id),
            }))
        : [],
    }),
  };
}

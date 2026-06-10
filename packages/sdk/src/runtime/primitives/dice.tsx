import { createContext, useContext, type ReactNode } from "react";

export type DiceValue = number | null | undefined;

export interface DiceState {
  values: ReadonlyArray<number | undefined> | undefined;
  /** Undefined if any die has not been rolled yet. */
  sum: number | undefined;
  diceCount: number;
  allRolled: boolean;
}

export interface DiceRootProps {
  values?: readonly DiceValue[] | null;
  /** Used when values are not provided. */
  count?: number;
  children: ReactNode;
}

export interface DiceValuesProps {
  children: (state: DiceState) => ReactNode;
}

export interface DiceComponents {
  Root(props: DiceRootProps): ReactNode;
  Values(props: DiceValuesProps): ReactNode;
}

const DiceContext = createContext<DiceState | null>(null);

export function normalizeDiceState({
  values,
  count = 2,
}: {
  values?: readonly DiceValue[] | null;
  count?: number;
}): DiceState {
  const normalizedValues = values?.map((value) => value ?? undefined);
  const allRolled =
    normalizedValues?.every((value) => value !== undefined) ?? false;
  const sum = allRolled
    ? normalizedValues?.reduce<number>(
        (total, value) => total + (value ?? 0),
        0,
      )
    : undefined;

  return {
    values: normalizedValues,
    sum,
    diceCount: normalizedValues?.length ?? count,
    allRolled,
  };
}

export function DiceRoot({ values, count, children }: DiceRootProps) {
  return (
    <DiceContext.Provider value={normalizeDiceState({ values, count })}>
      {children}
    </DiceContext.Provider>
  );
}

export function useDicePrimitiveContext(): DiceState {
  const value = useContext(DiceContext);
  if (!value) {
    throw new Error("Dice primitives must be rendered inside <Dice.Root>.");
  }
  return value;
}

export function DiceValues({ children }: DiceValuesProps) {
  return children(useDicePrimitiveContext());
}

export const Dice: DiceComponents = {
  Root: DiceRoot,
  Values: DiceValues,
};

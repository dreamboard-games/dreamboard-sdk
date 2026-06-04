import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChromeSuppressionRegistration = (id: string, suppressed: boolean) => void;

const ChromeSuppressionContext =
  createContext<ChromeSuppressionRegistration | null>(null);

export function ChromeSuppressionProvider({
  children,
  onSuppressedChange,
}: {
  children: ReactNode;
  onSuppressedChange: (suppressed: boolean) => void;
}) {
  const [suppressedEntries, setSuppressedEntries] = useState<
    ReadonlySet<string>
  >(() => new Set());

  const register = useCallback<ChromeSuppressionRegistration>(
    (id, suppressed) => {
      setSuppressedEntries((current) =>
        updateSuppressedEntries(current, id, suppressed),
      );
    },
    [],
  );
  const suppressed = suppressedEntries.size > 0;

  useEffect(() => {
    onSuppressedChange(suppressed);
  }, [onSuppressedChange, suppressed]);

  const value = useMemo(() => register, [register]);

  return (
    <ChromeSuppressionContext.Provider value={value}>
      {children}
    </ChromeSuppressionContext.Provider>
  );
}

export function useChromeSuppression(id: string, suppressed: boolean) {
  const register = useContext(ChromeSuppressionContext);

  useEffect(() => {
    if (!register) return;
    register(id, suppressed);
    return () => register(id, false);
  }, [id, register, suppressed]);
}

function updateSuppressedEntries(
  current: ReadonlySet<string>,
  id: string,
  suppressed: boolean,
) {
  if (current.has(id) === suppressed) return current;
  const next = new Set(current);
  if (suppressed) next.add(id);
  else next.delete(id);
  return next;
}

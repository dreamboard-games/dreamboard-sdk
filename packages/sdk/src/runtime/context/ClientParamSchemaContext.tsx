import { createContext, useContext } from "react";

export interface ClientParamSchema {
  safeParse: (value: unknown) =>
    | { success: true; data: Record<string, unknown> }
    | {
        success: false;
        error: {
          issues: ReadonlyArray<{
            path: readonly PropertyKey[];
            message: string;
          }>;
        };
      };
}

export type ClientParamSchemaMap = Readonly<
  Record<string, Readonly<Record<string, ClientParamSchema>>>
>;

const ClientParamSchemaContext = createContext<ClientParamSchemaMap>({});

export function ClientParamSchemaProvider({
  schemas,
  children,
}: {
  schemas?: ClientParamSchemaMap;
  children: React.ReactNode;
}) {
  return (
    <ClientParamSchemaContext.Provider value={schemas ?? {}}>
      {children}
    </ClientParamSchemaContext.Provider>
  );
}

export function useClientParamSchema(
  phaseName: string | null | undefined,
  interactionId: string,
): ClientParamSchema | undefined {
  const schemas = useContext(ClientParamSchemaContext);
  if (!phaseName) return undefined;
  return schemas[phaseName]?.[interactionId];
}

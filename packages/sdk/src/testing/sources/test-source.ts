import { createSourceLifecycle } from "../../headless/sources/lifecycle.js";
import { immutableCopy } from "../../headless/sources/immutable.js";
import { SourceSnapshotSchema } from "../../headless/sources/static.js";
import type {
  CommandSource,
  SourceSnapshot,
  SubmitResult,
} from "../../headless/sources/types.js";
import type { RuntimeJson } from "../../shared/runtime-json.js";
import { computePluginActionSetVersion } from "../../shared/protocol/digest.js";

export interface CapturedSubmission {
  readonly operation: "submit" | "cancel";
  readonly interactionId: string;
  readonly params?: RuntimeJson;
  resolve(result: SubmitResult): void;
}
export interface TestSource extends CommandSource {
  readonly submissions: readonly CapturedSubmission[];
  emit(snapshot: SourceSnapshot): void;
  recovering(): void;
  fail(error: Error): void;
}
/** Test-owned transport control; all request/barrier behavior remains production code. */
export function createTestSource(initial: SourceSnapshot): TestSource {
  const sessionId = crypto.randomUUID();
  const submissions: CapturedSubmission[] = [];
  const lifecycle = createSourceLifecycle({
    send(command) {
      submissions.push(
        Object.freeze({
          operation:
            command.type === "interaction.submit" ? "submit" : "cancel",
          interactionId: command.interactionId,
          ...(command.type === "interaction.submit"
            ? { params: immutableCopy(command.params) }
            : {}),
          resolve(result: SubmitResult) {
            lifecycle.result({
              ...result,
              type: "interaction.result",
              clientActionId: command.clientActionId,
            });
          },
        }),
      );
    },
    recover() {},
    close() {},
  });
  function emit(value: SourceSnapshot) {
    const snapshot = SourceSnapshotSchema.parse(value);
    lifecycle.session({ sessionId, players: snapshot.players });
    lifecycle.frame({
      ...snapshot.frame,
      basis: {
        version: snapshot.version,
        perspectivePlayerId: snapshot.me,
        actionSetVersion: computePluginActionSetVersion({
          version: snapshot.version,
          availableInteractions: snapshot.frame.availableInteractions,
        }),
      },
    });
  }
  emit(initial);
  return {
    ...lifecycle.source,
    get submissions() {
      return [...submissions];
    },
    emit,
    recovering: lifecycle.recovering,
    fail: lifecycle.fail,
  };
}

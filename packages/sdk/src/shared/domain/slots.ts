export interface ViewSlotOccupant<
  PieceIdValue extends string = string,
  PlayerIdValue extends string = string,
  SlotIdValue extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> {
  pieceId: PieceIdValue;
  playerId: PlayerIdValue | null;
  slotId: SlotIdValue;
  data?: Data;
}

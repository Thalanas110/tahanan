import type { CoupleType } from '../types/database.ts';

export function buildCreateLoveNoteInput(input: {
  roomId: string;
  roomType: CoupleType;
  recipientId?: string;
  title?: string;
  body: string;
  openWhen?: string;
}): {
  roomId: string;
  roomType: CoupleType;
  recipient_id?: string;
  title?: string;
  body: string;
  open_when?: string;
} {
  return {
    roomId: input.roomId,
    roomType: input.roomType,
    recipient_id: input.recipientId,
    title: input.title,
    body: input.body,
    open_when: input.openWhen,
  };
}

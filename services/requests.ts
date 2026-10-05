import { ShiftRequest } from "../types";
export function mergeRequest(
  previous: ShiftRequest[],
  incoming: ShiftRequest,
): ShiftRequest[] {
  const existing = previous.find((r) => r.id === incoming.id);
  if (existing && existing.version > incoming.version) return previous;
  return existing
    ? previous.map((r) => (r.id === incoming.id ? incoming : r))
    : [incoming, ...previous];
}

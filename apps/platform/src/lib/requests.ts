import type { RequestStatus, RequestKind } from "@prisma/client";

// The happy-path pipeline, in order. PAUSED / CLOSED sit outside it.
export const REQUEST_PIPELINE: RequestStatus[] = [
  "NEW",
  "QUALIFICATION",
  "CONSULTATION_SCHEDULED",
  "SEARCHING",
  "OPPORTUNITIES_IDENTIFIED",
  "CLIENT_REVIEW",
  "NEGOTIATION",
  "VERIFICATION",
  "PAYMENT",
  "SHIPPING",
  "COMPLETED",
];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  NEW: "New request",
  QUALIFICATION: "Qualification",
  CONSULTATION_SCHEDULED: "Consultation scheduled",
  SEARCHING: "Search in progress",
  OPPORTUNITIES_IDENTIFIED: "Opportunities identified",
  CLIENT_REVIEW: "Client review",
  NEGOTIATION: "Negotiation",
  VERIFICATION: "Verification",
  PAYMENT: "Payment coordination",
  SHIPPING: "Shipping & insurance",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  CLOSED: "Closed",
};

export const KIND_LABEL: Record<RequestKind, string> = {
  RECOMMENDATION: "Recommendation",
  EXACT_WATCH: "Known watch",
  RARE_PIECE: "Rare-piece mandate",
  BEST_DEAL: "Best international deal",
  TRADE: "Trade / upgrade",
};

/** Next pipeline status, or null if already at the end / off-pipeline. */
export function nextStatus(status: RequestStatus): RequestStatus | null {
  const i = REQUEST_PIPELINE.indexOf(status);
  if (i === -1 || i >= REQUEST_PIPELINE.length - 1) return null;
  return REQUEST_PIPELINE[i + 1];
}

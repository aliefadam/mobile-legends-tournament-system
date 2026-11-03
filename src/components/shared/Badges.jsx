import { ADMIN_STATUS_META, MATCH_STATUS_META, PAYMENT_STATUS_META, PUBLIC_STATUS_META } from "../../constants";
import { getPublicStatus } from "../../services/tournament";
import { Badge } from "../ui";

export function PublicStatusBadge({ tournament, className }) {
  const key = getPublicStatus(tournament);
  if (!key) return <Badge tone="neutral" className={className}>Draft</Badge>;
  const m = PUBLIC_STATUS_META[key];
  return <Badge tone={m.tone} className={className}>{m.label}</Badge>;
}

export function AdminStatusBadge({ status }) {
  const m = ADMIN_STATUS_META[status] || ADMIN_STATUS_META.draft;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function PaymentBadge({ status, long }) {
  const m = PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.pending;
  return <Badge tone={m.tone}>{long ? m.label : m.short}</Badge>;
}

export function MatchBadge({ status }) {
  const m = MATCH_STATUS_META[status] || MATCH_STATUS_META.upcoming;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

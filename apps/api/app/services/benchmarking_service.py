"""Cross-company benchmarking (System Analysis §26 / Phase P-F).

Rolls each employee's readiness up to their subsidiary company (via the org
materialized tree) so subsidiaries can be compared like-for-like. Read-only.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee, OrgNode
from app.models.readiness import ReadinessScore

_READY = {"READY", "READY_MINOR_GAPS"}


def _subsidiary_of(node_id: str | None, nodes: dict[str, OrgNode]) -> OrgNode | None:
    seen: set[str] = set()
    cur = nodes.get(node_id) if node_id else None
    while cur and cur.id not in seen:
        if cur.node_type == "SUBSIDIARY":
            return cur
        seen.add(cur.id)
        cur = nodes.get(cur.parent_id) if cur.parent_id else None
    return None


def companies(db: Session) -> list[dict]:
    nodes = {n.id: n for n in db.execute(select(OrgNode)).scalars().all()}
    employees = db.execute(select(Employee)).scalars().all()
    rows = db.execute(
        select(ReadinessScore).where(ReadinessScore.entity_type == "EMPLOYEE")
        .order_by(ReadinessScore.created_at.desc())
    ).scalars().all()
    latest: dict[str, ReadinessScore] = {}
    for r in rows:
        latest.setdefault(r.entity_id, r)

    agg: dict[str, dict] = {}
    for e in employees:
        sub = _subsidiary_of(e.section_id, nodes)
        if not sub:
            continue
        a = agg.setdefault(sub.id, {"company_id": sub.id, "name_en": sub.name_en,
                                    "name_ar": sub.name_ar, "_idx": [], "headcount": 0, "ready": 0})
        a["headcount"] += 1
        rs = latest.get(e.id)
        if rs:
            a["_idx"].append(rs.readiness_index)
            if rs.readiness_status in _READY:
                a["ready"] += 1

    out = []
    for a in agg.values():
        idx = a.pop("_idx")
        a["avg_readiness"] = round(sum(idx) / len(idx), 1) if idx else 0.0
        a["assessed"] = len(idx)
        a["ready_pct"] = round(100 * a["ready"] / a["headcount"], 1) if a["headcount"] else 0.0
        out.append(a)
    out.sort(key=lambda x: -x["avg_readiness"])
    for i, a in enumerate(out, start=1):
        a["rank"] = i
    return out

"""Workforce groups & talent pools orchestration (System Analysis §3.13, §16 / Phase P-M)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.groups import TalentPool, TalentPoolMember, WorkforceGroup, WorkforceGroupMember
from app.models.l1_l2 import Employee
from app.models.readiness import ReadinessScore
from app.services.engines.governance import append_audit

_READY = {"READY", "READY_MINOR_GAPS"}


def create_group(db: Session, *, actor_user_id: str | None, tenant_id: str, name_en: str,
                 name_ar: str, group_type: str = "Custom", company_id: str | None = None) -> WorkforceGroup:
    g = WorkforceGroup(tenant_id=tenant_id, name_en=name_en, name_ar=name_ar, group_type=group_type,
                       company_id=company_id, created_by=actor_user_id)
    db.add(g)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_GROUP",
                 entity="grp_group", entity_id=g.id, after={"name": name_en, "type": group_type})
    return g


def add_member(db: Session, *, group_id: str, employee_id: str, membership_reason: str = "") -> WorkforceGroupMember:
    g = db.get(WorkforceGroup, group_id)
    if not g:
        raise ValueError("group not found")
    m = WorkforceGroupMember(tenant_id=g.tenant_id, group_id=group_id, employee_id=employee_id,
                             membership_reason=membership_reason)
    db.add(m)
    db.flush()
    return m


def _latest_readiness(db: Session) -> dict[str, ReadinessScore]:
    rows = db.execute(
        select(ReadinessScore).where(ReadinessScore.entity_type == "EMPLOYEE")
        .order_by(ReadinessScore.created_at.desc())
    ).scalars().all()
    latest: dict[str, ReadinessScore] = {}
    for r in rows:
        latest.setdefault(r.entity_id, r)
    return latest


def group_readiness(db: Session, group_id: str) -> dict:
    g = db.get(WorkforceGroup, group_id)
    if not g:
        raise ValueError("group not found")
    members = db.execute(select(WorkforceGroupMember).where(WorkforceGroupMember.group_id == group_id)).scalars().all()
    names = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    latest = _latest_readiness(db)
    idx = [latest[m.employee_id].readiness_index for m in members if m.employee_id in latest]
    ready = sum(1 for m in members if m.employee_id in latest and latest[m.employee_id].readiness_status in _READY)
    return {
        "group_id": g.id, "name_en": g.name_en, "name_ar": g.name_ar, "group_type": g.group_type,
        "members": len(members), "assessed": len(idx),
        "avg_readiness": round(sum(idx) / len(idx), 1) if idx else 0.0,
        "ready": ready,
        "member_list": [
            {"employee_id": m.employee_id,
             "name_en": names[m.employee_id].full_name_en if m.employee_id in names else m.employee_id,
             "name_ar": names[m.employee_id].full_name_ar if m.employee_id in names else m.employee_id,
             "readiness_index": latest[m.employee_id].readiness_index if m.employee_id in latest else None,
             "readiness_status": latest[m.employee_id].readiness_status if m.employee_id in latest else None}
            for m in members],
    }


def create_pool(db: Session, *, actor_user_id: str | None, tenant_id: str, name_en: str,
                name_ar: str, pool_type: str = "HiPo") -> TalentPool:
    p = TalentPool(tenant_id=tenant_id, name_en=name_en, name_ar=name_ar, pool_type=pool_type)
    db.add(p)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_TALENT_POOL",
                 entity="tal_pool", entity_id=p.id, after={"name": name_en, "type": pool_type})
    return p


def add_pool_member(db: Session, *, pool_id: str, employee_id: str) -> TalentPoolMember:
    p = db.get(TalentPool, pool_id)
    if not p:
        raise ValueError("pool not found")
    m = TalentPoolMember(tenant_id=p.tenant_id, pool_id=pool_id, employee_id=employee_id)
    db.add(m)
    db.flush()
    return m

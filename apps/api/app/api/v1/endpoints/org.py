"""L1 · Institutional hierarchy (tenant tree) + strategic context."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db_for
from app.models.l1_l2 import OrgNode
from app.schemas import OrgNodeOut

router = APIRouter(prefix="/org", tags=["L1 · Strategy & Institutional Context"])


@router.get("/nodes", response_model=list[OrgNodeOut])
def list_nodes(db: Session = Depends(get_db_for)) -> list[OrgNode]:
    """List org nodes visible to the requester (RLS-scoped to their subtree)."""
    return list(db.execute(select(OrgNode).order_by(OrgNode.path)).scalars().all())


@router.get("/tree")
def org_tree(db: Session = Depends(get_db_for)) -> list[dict]:
    """Return the hierarchy as a nested tree (NOC → … → employee)."""
    nodes = list(db.execute(select(OrgNode).order_by(OrgNode.path)).scalars().all())
    by_id: dict[str, dict] = {
        n.id: {
            "id": n.id, "node_type": n.node_type,
            "name_en": n.name_en, "name_ar": n.name_ar,
            "activity_segment": n.activity_segment, "children": [],
        }
        for n in nodes
    }
    roots: list[dict] = []
    for n in nodes:
        if n.parent_id and n.parent_id in by_id:
            by_id[n.parent_id]["children"].append(by_id[n.id])
        else:
            roots.append(by_id[n.id])
    return roots

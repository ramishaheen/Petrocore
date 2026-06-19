"""Knowledge Graph (System Analysis §31 Phase 4 / Phase P-F).

Builds a node/edge graph by traversing the generic EntityLink seam (P-A) — the
future-proofing relationship table — resolving human-readable labels per entity
type. This is the read model the spec reserves for a full knowledge graph.
"""
from __future__ import annotations

from collections import deque

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.core_ext import EntityLink
from app.models.l1_l2 import Employee, Job, StrategicElement
from app.models.l3_l4 import Competency
from app.models.l5_l6 import Asset

_MAX_NODES = 120


def _labels(db: Session) -> dict[tuple[str, str], dict]:
    out: dict[tuple[str, str], dict] = {}
    for e in db.execute(select(Employee)).scalars().all():
        out[("Employee", e.id)] = {"en": e.full_name_en, "ar": e.full_name_ar}
    for c in db.execute(select(Competency)).scalars().all():
        out[("Competency", c.id)] = {"en": c.name_en, "ar": c.name_ar}
    for j in db.execute(select(Job)).scalars().all():
        out[("Role", j.id)] = {"en": j.title_en, "ar": j.title_ar}
        out[("Job", j.id)] = {"en": j.title_en, "ar": j.title_ar}
    for a in db.execute(select(Asset)).scalars().all():
        out[("Asset", a.id)] = {"en": a.name_en, "ar": a.name_ar}
    for s in db.execute(select(StrategicElement)).scalars().all():
        out[("Strategy", s.id)] = {"en": s.title_en, "ar": s.title_ar}
    return out


def _node(entity_type: str, entity_id: str, labels: dict) -> dict:
    lab = labels.get((entity_type, entity_id))
    return {
        "id": f"{entity_type}:{entity_id}", "entity_type": entity_type, "entity_id": entity_id,
        "label_en": lab["en"] if lab else entity_id, "label_ar": lab["ar"] if lab else entity_id,
    }


def graph(db: Session, *, entity_type: str | None = None, entity_id: str | None = None, depth: int = 2) -> dict:
    links = db.execute(select(EntityLink).where(EntityLink.status == "ACTIVE")).scalars().all()
    labels = _labels(db)

    if entity_type and entity_id:
        # BFS outward from the seed node.
        adj: dict[str, list[EntityLink]] = {}
        for ln in links:
            adj.setdefault(f"{ln.source_entity_type}:{ln.source_entity_id}", []).append(ln)
            adj.setdefault(f"{ln.target_entity_type}:{ln.target_entity_id}", []).append(ln)
        start = f"{entity_type}:{entity_id}"
        seen_nodes: set[str] = {start}
        used: list[EntityLink] = []
        q: deque[tuple[str, int]] = deque([(start, 0)])
        while q:
            node, d = q.popleft()
            if d >= depth:
                continue
            for ln in adj.get(node, []):
                used.append(ln)
                for nxt in (f"{ln.source_entity_type}:{ln.source_entity_id}",
                            f"{ln.target_entity_type}:{ln.target_entity_id}"):
                    if nxt not in seen_nodes:
                        seen_nodes.add(nxt)
                        q.append((nxt, d + 1))
        links = list({id(x): x for x in used}.values())

    links = links[:_MAX_NODES]
    node_keys: set[tuple[str, str]] = set()
    edges = []
    for ln in links:
        node_keys.add((ln.source_entity_type, ln.source_entity_id))
        node_keys.add((ln.target_entity_type, ln.target_entity_id))
        edges.append({
            "source": f"{ln.source_entity_type}:{ln.source_entity_id}",
            "target": f"{ln.target_entity_type}:{ln.target_entity_id}",
            "link_type": ln.link_type, "weight": ln.relationship_weight,
        })
    nodes = [_node(t, i, labels) for (t, i) in node_keys]
    return {"nodes": nodes, "edges": edges, "node_count": len(nodes), "edge_count": len(edges)}


def summary(db: Session) -> dict:
    links = db.execute(select(EntityLink).where(EntityLink.status == "ACTIVE")).scalars().all()
    by_type: dict[str, int] = {}
    entities: set[tuple[str, str]] = set()
    for ln in links:
        by_type[ln.link_type] = by_type.get(ln.link_type, 0) + 1
        entities.add((ln.source_entity_type, ln.source_entity_id))
        entities.add((ln.target_entity_type, ln.target_entity_id))
    return {
        "total_links": len(links), "total_entities": len(entities),
        "by_link_type": [{"link_type": k, "count": v} for k, v in sorted(by_type.items())],
    }

"""Seed the extensible core + workforce segmentation (idempotent)."""
from sqlalchemy.orm import Session

from app.models.core_ext import EntityType, LookupType, LookupValue
from app.models.workforce import CareerStream, RoleArchetype, RoleLevel, WorkforceFamily

FAMILIES = [
    ("OPS", "Operations", "العمليات", "Technical"),
    ("MNT", "Maintenance", "الصيانة", "Technical"),
    ("ENG", "Engineering & Technical", "الهندسة والفني", "Technical"),
    ("HSE", "HSE & Process Safety", "السلامة وسلامة العمليات", "Technical"),
    ("PRJ", "Projects & Turnaround", "المشاريع والعمرات", "Technical"),
    ("SCM", "Supply Chain & Contracts", "سلسلة الإمداد والعقود", "Support"),
    ("FIN", "Finance & Commercial", "المالية والتجارية", "Financial"),
    ("HRT", "HR & Training", "الموارد البشرية والتدريب", "Administrative"),
    ("ITD", "IT & Digital", "تقنية المعلومات والرقمنة", "Support"),
    ("LEG", "Legal & Governance", "القانون والحوكمة", "Administrative"),
    ("ADM", "Administration & Support", "الإدارة والدعم", "Support"),
    ("LDR", "Leadership & Executive", "القيادة والإدارة التنفيذية", "Leadership"),
]
STREAMS = [
    ("TECH", "Technical", "فني"), ("SUP", "Supervisory", "إشرافي"),
    ("MGMT", "Management", "إداري"), ("LEAD", "Leadership", "قيادي"),
    ("PM", "Project Management", "إدارة مشاريع"), ("SPEC", "Specialist", "أخصائي"),
    ("SUPF", "Support", "دعم"), ("GRAD", "Graduate / Trainee", "متدرب"),
]
LEVELS = [
    ("L1", "Trainee / Entry", "متدرب", 1), ("L2", "Junior / Operator", "مبتدئ", 2),
    ("L3", "Experienced / Specialist", "ذو خبرة", 3), ("L4", "Senior / Lead", "أول", 4),
    ("L5", "Supervisor", "مشرف", 5), ("L6", "Manager", "مدير", 6),
    ("L7", "Senior Manager", "مدير أول", 7), ("L8", "Executive", "تنفيذي", 8),
]
ARCHETYPES = [
    ("BOARD", "Board / Executive", "مجلس/تنفيذي"), ("DIR", "Director", "مدير عام"),
    ("MGR", "Manager", "مدير إدارة"), ("SECH", "Section Head", "رئيس قسم"),
    ("UNIT", "Unit Head", "رئيس وحدة"), ("SPEC", "Specialist", "أخصائي"),
    ("TECH", "Technician", "فني"), ("OPER", "Operator", "مشغل"),
]
ENTITY_TYPES = ["Employee", "Role", "Company", "Department", "Competency", "Assessment",
                "Asset", "Project", "Strategy", "Evidence", "Gap", "Training"]
LOOKUPS = {
    "EVIDENCE_TYPE": [("CERT", "Certificate", "شهادة"), ("DEGREE", "Degree", "مؤهل"),
                      ("WORK", "Work Record", "سجل عمل"), ("MGR", "Manager Review", "تقييم مدير"),
                      ("OBS", "Practical Observation", "ملاحظة عملية"), ("TEST", "Test Result", "نتيجة اختبار")],
    "GAP_TYPE": [("QUAL", "Qualification", "مؤهل"), ("CERTG", "Certification", "شهادة"),
                 ("EXP", "Experience", "خبرة"), ("KNOW", "Knowledge", "معرفة"),
                 ("SKILL", "Skill", "مهارة"), ("BEH", "Behavior", "سلوك"),
                 ("LEAD", "Leadership", "قيادة"), ("TECHNICAL", "Technical", "فني"), ("SAFE", "Safety", "سلامة")],
    "RISK_LEVEL": [("LOW", "Low", "منخفض"), ("MED", "Medium", "متوسط"),
                   ("HIGH", "High", "مرتفع"), ("CRIT", "Critical", "حرج")],
    "READINESS_STATUS": [("READY", "Ready", "جاهز"), ("MINOR", "Ready with Minor Gaps", "جاهز بفجوات بسيطة"),
                         ("DEV", "Development Required", "يحتاج تطوير"), ("NOTREADY", "Not Ready for Critical Role", "غير جاهز لدور حرج"),
                         ("EVID", "Evidence Insufficient", "الأدلة غير كافية"), ("REASSESS", "Reassessment Required", "يحتاج إعادة تقييم")],
    "ASSESSMENT_PURPOSE": [("BASE", "Baseline", "خط أساس"), ("PROMO", "Promotion", "ترقية"),
                           ("SUCC", "Succession", "إحلال"), ("TNEED", "Training Need", "احتياج تدريبي"), ("CERTP", "Certification", "اعتماد")],
}


def seed_core(db: Session) -> None:
    if db.query(WorkforceFamily).count() > 0:
        return

    for code, en, ar, domain in FAMILIES:
        db.add(WorkforceFamily(code=code, name_en=en, name_ar=ar, family_domain=domain))
    for code, en, ar in STREAMS:
        db.add(CareerStream(code=code, name_en=en, name_ar=ar))
    for code, en, ar, rank in LEVELS:
        db.add(RoleLevel(level_code=code, name_en=en, name_ar=ar, level_rank=rank))
    for code, en, ar in ARCHETYPES:
        db.add(RoleArchetype(code=code, name_en=en, name_ar=ar))
    for code in ENTITY_TYPES:
        db.add(EntityType(code=code, name=code))
    for type_code, values in LOOKUPS.items():
        lt = LookupType(code=type_code, name=type_code.replace("_", " ").title(), is_system=True)
        db.add(lt)
        db.flush()
        for i, (vc, en, ar) in enumerate(values):
            db.add(LookupValue(lookup_type_id=lt.id, value_code=vc, name_en=en, name_ar=ar, sort_order=i))
    db.flush()

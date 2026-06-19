"""All ORM models, imported so Alembic autogenerate sees them."""
from app.models.user import AppUser
from app.models.l1_l2 import (
    OrgNode, StrategicElement, Job, Employee, Appraisal, Kpi,
)
from app.models.l3_l4 import (
    Competency, CompetencyRequirement, DepartmentPlan, OperationalRequirement,
)
from app.models.l5_l6 import (
    Profile, ProfileApproval, CompetencyResult, Asset, CompetencyAssetLink, CriticalRole,
)
from app.models.l7_l8 import (
    Question, Assessment, AssessmentItem, Evidence, AuditTrail,
    Gap, GapReport, Recommendation,
)
from app.models.l9_gov import (
    TrainingNeed, Program, Nomination, TrainingImpact, GovDecision, AuditLog,
)
from app.models.core_ext import (
    LookupType, LookupValue, EntityType, EntityLink, CustomFieldDefinition, CustomFieldValue,
)
from app.models.workforce import (
    WorkforceFamily, CareerStream, RoleLevel, RoleArchetype,
)
from app.models.competency_v2 import (
    ProficiencyLevel, CompetencyDomain, CompetencyCluster, CompetencyTaxonomy,
    CompetencyDescriptor, EvidenceRequirementProfile,
    RoleCompetencyProfile, RoleCompetencyRequirement,
)
from app.models.employee_360 import (
    EmployeeQualification, EmployeeCertification, EmployeeExperience,
)
from app.models.assessment_v2 import (
    ScoringRubric, AssessmentBlueprint, AssessmentBlueprintCompetency, AssessmentBlueprintRule,
    AIQuestionGenerationRequest, AIGeneratedQuestion, QuestionReview,
)
from app.models.readiness import ReadinessScore
from app.models.talent import (
    TalentProfile, SuccessionPlan, SuccessorCandidate, KnowledgeHolder, KnowledgeTransferPlan,
)

__all__ = [
    "AppUser",
    "OrgNode", "StrategicElement", "Job", "Employee", "Appraisal", "Kpi",
    "Competency", "CompetencyRequirement", "DepartmentPlan", "OperationalRequirement",
    "Profile", "ProfileApproval", "CompetencyResult", "Asset", "CompetencyAssetLink", "CriticalRole",
    "Question", "Assessment", "AssessmentItem", "Evidence", "AuditTrail",
    "Gap", "GapReport", "Recommendation",
    "TrainingNeed", "Program", "Nomination", "TrainingImpact", "GovDecision", "AuditLog",
    "LookupType", "LookupValue", "EntityType", "EntityLink",
    "CustomFieldDefinition", "CustomFieldValue",
    "WorkforceFamily", "CareerStream", "RoleLevel", "RoleArchetype",
    "ProficiencyLevel", "CompetencyDomain", "CompetencyCluster", "CompetencyTaxonomy",
    "CompetencyDescriptor", "EvidenceRequirementProfile",
    "RoleCompetencyProfile", "RoleCompetencyRequirement",
    "EmployeeQualification", "EmployeeCertification", "EmployeeExperience",
    "ScoringRubric", "AssessmentBlueprint", "AssessmentBlueprintCompetency",
    "AssessmentBlueprintRule", "AIQuestionGenerationRequest", "AIGeneratedQuestion",
    "QuestionReview",
    "ReadinessScore",
    "TalentProfile", "SuccessionPlan", "SuccessorCandidate",
    "KnowledgeHolder", "KnowledgeTransferPlan",
]

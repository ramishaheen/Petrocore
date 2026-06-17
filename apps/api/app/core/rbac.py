"""Role-based access control — roles per spec §3."""
from enum import Enum


class Role(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    LINE_MANAGER = "LINE_MANAGER"
    HR_VALIDATOR = "HR_VALIDATOR"
    DEPT_MANAGER = "DEPT_MANAGER"
    LD_MANAGER = "LD_MANAGER"
    COMPANY_ADMIN = "COMPANY_ADMIN"
    NOC_EXECUTIVE = "NOC_EXECUTIVE"
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    CONSULTANT = "CONSULTANT"


# Arabic labels for roles (UI/reporting parity).
ROLE_LABELS_AR: dict[str, str] = {
    "EMPLOYEE": "الموظف",
    "LINE_MANAGER": "المدير المباشر",
    "HR_VALIDATOR": "الموارد البشرية",
    "DEPT_MANAGER": "مدير الإدارة",
    "LD_MANAGER": "مدير التدريب والتطوير",
    "COMPANY_ADMIN": "مسؤول الشركة",
    "NOC_EXECUTIVE": "الإدارة العليا",
    "PLATFORM_ADMIN": "مسؤول المنصة",
    "CONSULTANT": "الفريق الاستشاري",
}

# Roles with cross-tenant / elevated reach.
GLOBAL_ROLES = {Role.PLATFORM_ADMIN, Role.NOC_EXECUTIVE}
# Roles permitted to participate in the dual profile-approval chain.
PROFILE_APPROVERS = {Role.LINE_MANAGER, Role.HR_VALIDATOR}
# Roles permitted to act on the governance decision gate.
GOVERNANCE_APPROVERS = {Role.HR_VALIDATOR, Role.DEPT_MANAGER, Role.LD_MANAGER,
                        Role.COMPANY_ADMIN, Role.NOC_EXECUTIVE, Role.PLATFORM_ADMIN}

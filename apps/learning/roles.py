"""Learning roles.

Two jobs, deliberately separated: writing content and releasing it. An editor can draft and
change anything; only a publisher can put it in front of students. That way a mistake in a draft
cannot reach anybody because the wrong person pressed save.
"""

from apps.staff.roles import StaffRole

CONTENT_MODELS = (
    "chapter",
    "subchapter",
    "learningcontent",
    "sign",
    "question",
    "questionoption",
    "practiceexam",
    "examquestion",
)

# Everything needed to write and change learning content, but not to release it.
EDITING = tuple(f"learning.{action}_{model}" for model in CONTENT_MODELS for action in ("view", "add", "change"))
PUBLISHABLE = ("chapter", "subchapter", "learningcontent", "question", "practiceexam")
PUBLISHING = tuple(f"learning.publish_{model}" for model in PUBLISHABLE)

CONTENT_EDITOR = StaffRole(name="Content Editor", permissions=EDITING)
CONTENT_PUBLISHER = StaffRole(name="Content Publisher", permissions=EDITING + PUBLISHING)

ROLES = (CONTENT_EDITOR, CONTENT_PUBLISHER)

"""The endpoints students use to read the learning material.

What a student is served is decided twice over, and never by the browser:

* only material that is **live** — published, and past its scheduled time;
* only material their **package** includes, checked against the item, its subchapter and its
  chapter, so a package that excludes a chapter excludes everything inside it.

The frontend keeps its own words. A chapter is a "topic" and a subchapter is a "lesson" in these
responses, so renaming things inside the product did not reach the API. Keys are camelCase and a
lapsed plan answers 402, matching the contract the frontend already implements.
"""

from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.entitlements import services as entitlements
from apps.learning import services
from apps.learning.models import Chapter, Sign, Subchapter

PLAN_NEEDED = "An active plan is needed for this"
HIGHWAY_CODE_SLUG = "highway-code"


def plan_needed() -> Response:
    """402 rather than 403: the student is signed in, they simply have nothing to read with."""
    return Response({"detail": PLAN_NEEDED}, status=status.HTTP_402_PAYMENT_REQUIRED)


def sign_map(codes) -> dict:
    """The signs a payload mentions, by code, so the frontend can draw them without asking again."""
    return {
        sign.code: {
            "code": sign.code,
            "name": sign.name,
            "category": sign.category,
            "meaning": sign.meaning,
            "spec": sign.spec,
        }
        for sign in Sign.objects.filter(code__in=codes)
    }


class TopicListView(APIView):
    """The catalogue: chapters and the subchapters inside them, titles only.

    Readable without a plan, so somebody deciding what to buy can see what is on offer. The
    material itself is not here.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="listTopics", summary="List the topics and their lessons", responses={200: dict})
    def get(self, request: Request) -> Response:
        student = cast(User, request.user)
        chapters = services.live(Chapter.objects.all()).order_by("order", "title")
        if entitlements.has_access(student):
            chapters = entitlements.visible_chapters(student, chapters)

        topics = []
        for chapter in chapters:
            subchapters = services.live_subchapters_of(chapter).order_by("order", "title")
            if entitlements.has_access(student):
                subchapters = entitlements.visible_subchapters(student, subchapters)

            topics.append(
                {
                    "slug": chapter.slug,
                    "title": chapter.title,
                    "description": chapter.description,
                    "icon": chapter.icon,
                    # Progress is not recorded yet, so these are honest zeroes rather than
                    # missing keys the frontend would have to guard against.
                    "mastery": 0,
                    "questions": 0,
                    "lessons": [
                        {
                            "slug": subchapter.slug,
                            "title": subchapter.title,
                            "summary": subchapter.summary,
                            "minutes": subchapter.minutes,
                            "done": False,
                        }
                        for subchapter in subchapters
                    ],
                }
            )

        return Response({"topics": topics})


class LessonDetailView(APIView):
    """One subchapter with its material, which is what a student actually reads."""

    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="getLesson", summary="Read a lesson", responses={200: dict, 402: dict, 404: dict})
    def get(self, request: Request, slug: str) -> Response:
        student = cast(User, request.user)
        subchapter = services.live(Subchapter.objects.select_related("chapter")).filter(slug=slug).first()
        if subchapter is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not entitlements.can_view(student, subchapter):
            # The same answer whether the plan lapsed or the package never included this, so the
            # endpoint cannot be used to map out what other packages contain.
            return plan_needed()

        content = entitlements.visible_content(student, services.live_content_of(subchapter)).order_by(
            "order", "title"
        )

        neighbours = list(services.live_subchapters_of(subchapter.chapter).order_by("order", "title"))
        position = next((i for i, item in enumerate(neighbours) if item.pk == subchapter.pk), None)

        return Response(
            {
                "lesson": {
                    "slug": subchapter.slug,
                    "title": subchapter.title,
                    "summary": subchapter.summary,
                    "minutes": subchapter.minutes,
                    "blocks": [services.block_for(item) for item in content],
                },
                "topic": {
                    "slug": subchapter.chapter.slug,
                    "title": subchapter.chapter.title,
                    "icon": subchapter.chapter.icon,
                },
                "done": False,
                "prev": _link(neighbours, position, -1),
                "next": _link(neighbours, position, 1),
                "signs": {},
                "questions": {},
                "clips": {},
            }
        )


def _link(neighbours: list, position: int | None, step: int) -> dict | None:
    """The previous or next lesson in the same chapter, or None at either end."""
    if position is None:
        return None
    wanted = position + step
    if wanted < 0 or wanted >= len(neighbours):
        return None
    return {"slug": neighbours[wanted].slug, "title": neighbours[wanted].title}


class EbookView(APIView):
    """The Highway Code: a chapter like any other, presented as a book."""

    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="listChapters", summary="List the e-book chapters", responses={200: dict, 404: dict})
    def get(self, request: Request) -> Response:
        student = cast(User, request.user)
        book = services.live(Chapter.objects.all()).filter(slug=HIGHWAY_CODE_SLUG).first()
        if book is None:
            return Response({"chapters": [], "current": None})

        sections = entitlements.visible_subchapters(student, services.live_subchapters_of(book)).order_by(
            "order", "title"
        )

        return Response(
            {
                "chapters": [
                    {
                        "slug": section.slug,
                        "title": section.title,
                        "summary": section.summary,
                        "number": number,
                        "read": False,
                    }
                    for number, section in enumerate(sections, start=1)
                ],
                # Where the student left off, once reading progress is recorded.
                "current": None,
            }
        )


class EbookChapterView(APIView):
    """One part of the Highway Code to read."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="getChapter", summary="Read an e-book chapter", responses={200: dict, 402: dict, 404: dict}
    )
    def get(self, request: Request, slug: str) -> Response:
        student = cast(User, request.user)
        section = (
            services.live(Subchapter.objects.select_related("chapter"))
            .filter(slug=slug, chapter__slug=HIGHWAY_CODE_SLUG)
            .first()
        )
        if section is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not entitlements.can_view(student, section):
            return plan_needed()

        content = entitlements.visible_content(student, services.live_content_of(section)).order_by("order", "title")
        siblings = list(services.live_subchapters_of(section.chapter).order_by("order", "title"))
        position = next((i for i, item in enumerate(siblings) if item.pk == section.pk), None)

        return Response(
            {
                "chapter": {
                    "slug": section.slug,
                    "title": section.title,
                    "summary": section.summary,
                    "number": (position or 0) + 1,
                    "blocks": [services.block_for(item) for item in content],
                },
                "toc": [
                    {"slug": item.slug, "title": item.title, "number": number}
                    for number, item in enumerate(siblings, start=1)
                ],
                "prev": _link(siblings, position, -1),
                "next": _link(siblings, position, 1),
                "signs": {},
                "questions": {},
                "clips": {},
            }
        )


class SignListView(APIView):
    """The road sign library, drawn by the frontend from each sign's specification."""

    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="listSigns", summary="List the road signs", responses={200: dict, 402: dict})
    def get(self, request: Request) -> Response:
        student = cast(User, request.user)
        if not entitlements.has_access(student):
            return plan_needed()

        signs = Sign.objects.all().order_by("category", "order", "name")
        return Response({"signs": list(sign_map(signs.values_list("code", flat=True)).values())})

"""Sitting an exam.

The rules that matter: the answers are never in what a student is served, a sitting is scored on
the server against every question it asked, and an exam a package does not fully cover is not
offered at all rather than offered short.
"""

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.core.models import PublishStatus
from apps.learning import services
from apps.learning.models import ExamKind, PracticeExam
from apps.learning.tests.conftest import sign_in

pytestmark = pytest.mark.django_db

EXAMS_URL = reverse("learn-exams")


def exam_url(slug: str) -> str:
    return reverse("learn-exam", args=[slug])


def submit_url(slug: str) -> str:
    return reverse("learn-exam-submit", args=[slug])


@pytest.fixture
def live_exam(chapter, make_question, publisher):
    """A published mock test of two published questions, the first answer right in each."""
    chapter.status = PublishStatus.PUBLISHED
    chapter.save(update_fields=["status"])

    exam = PracticeExam.objects.create(
        slug="mock-1", title="Mock test 1", kind=ExamKind.MOCK, pass_mark=2, time_limit_seconds=3420
    )
    for order, key in enumerate(("first", "second"), start=1):
        question = make_question(key=key)
        services.publish(actor=publisher, instance=question)
        exam.exam_questions.create(question=question, order=order)

    services.publish(actor=publisher, instance=exam)
    exam.refresh_from_db()
    return exam


class TestListing:
    def test_a_student_sees_the_exams_on_offer(self, api, student, live_exam):
        response = sign_in(api, student()).get(EXAMS_URL)

        assert response.status_code == 200
        assert response.data["exams"][0]["slug"] == "mock-1"

    def test_it_says_what_sitting_the_exam_involves(self, api, student, live_exam):
        """The frontend shows the clock and the pass mark before the student starts."""
        exam = sign_in(api, student()).get(EXAMS_URL).data["exams"][0]

        assert exam["questionCount"] == 2
        assert exam["passMark"] == 2
        assert exam["timeLimitSeconds"] == 3420
        assert exam["kind"] == "mock"

    def test_mock_tests_can_be_asked_for_on_their_own(self, api, student, live_exam, publisher):
        practice = PracticeExam.objects.create(
            slug="signs-drill", title="Signs drill", kind=ExamKind.PRACTICE, pass_mark=1
        )
        practice.exam_questions.create(question=live_exam.questions.first(), order=1)
        services.publish(actor=publisher, instance=practice)

        listed = sign_in(api, student()).get(EXAMS_URL, {"kind": "mock"}).data["exams"]

        assert [exam["slug"] for exam in listed] == ["mock-1"]

    def test_draft_exams_are_not_offered(self, api, student, live_exam):
        live_exam.status = PublishStatus.DRAFT
        live_exam.save(update_fields=["status"])

        assert sign_in(api, student()).get(EXAMS_URL).data["exams"] == []

    def test_somebody_without_a_plan_is_asked_to_buy_one(self, api, live_exam, db):
        browsing = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        assert sign_in(api, browsing).get(EXAMS_URL).status_code == 402

    def test_signed_out_visitors_are_refused(self, api, live_exam):
        assert api.get(EXAMS_URL).status_code == 401


class TestSittingOne:
    def test_the_questions_come_back_in_the_order_staff_arranged(self, api, student, live_exam):
        response = sign_in(api, student()).get(exam_url("mock-1"))

        assert response.status_code == 200
        assert [question["key"] for question in response.data["questions"]] == ["first", "second"]

    def test_the_answers_are_not_in_the_paper(self, api, student, live_exam):
        """Otherwise the whole sitting could be read out of the response."""
        response = sign_in(api, student()).get(exam_url("mock-1"))

        assert "is_correct" not in str(response.data)
        assert "correctIds" not in str(response.data)

    def test_the_signs_the_questions_mention_come_with_them(self, api, student, live_exam, sign):
        live_exam.questions.update(media_sign=sign)

        response = sign_in(api, student()).get(exam_url("mock-1"))

        assert response.data["signs"]["give-way"]["name"] == "Give way"

    def test_an_unknown_exam_is_not_found(self, api, student, live_exam):
        assert sign_in(api, student()).get(exam_url("no-such-exam")).status_code == 404

    def test_a_draft_exam_is_not_found(self, api, student, live_exam):
        live_exam.status = PublishStatus.DRAFT
        live_exam.save(update_fields=["status"])

        assert sign_in(api, student()).get(exam_url("mock-1")).status_code == 404

    def test_a_question_unpublished_after_the_exam_went_live_is_left_out(self, api, student, live_exam, publisher):
        """The sitting is shortened rather than broken, and the marking counts what was asked."""
        services.unpublish(actor=publisher, instance=live_exam.questions.get(key="second"))

        response = sign_in(api, student()).get(exam_url("mock-1"))

        assert [question["key"] for question in response.data["questions"]] == ["first"]


class TestPackages:
    def test_an_exam_the_package_does_not_fully_cover_is_not_offered(self, api, student, live_exam, packages, chapter):
        """All or nothing: a shortened paper could not reach its pass mark."""
        chapter.only_for_packages.add(packages["premium"])

        starter = sign_in(api, student("starter"))

        assert starter.get(EXAMS_URL).data["exams"] == []
        assert starter.get(exam_url("mock-1")).status_code == 402
        assert starter.post(submit_url("mock-1"), {"answers": {}}, format="json").status_code == 402

    def test_it_is_offered_to_somebody_on_that_package(self, api, student, live_exam, packages, chapter):
        chapter.only_for_packages.add(packages["premium"])

        response = sign_in(api, student("premium")).get(EXAMS_URL)

        assert [exam["slug"] for exam in response.data["exams"]] == ["mock-1"]


class TestMarking:
    def answers(self, exam, *, right: int) -> dict:
        """A submission with the first ``right`` questions answered correctly, the rest wrongly."""
        chosen = {}
        for index, question in enumerate(services.questions_in_exam(exam)):
            chosen[str(question.pk)] = ["a"] if index < right else ["b"]
        return {"answers": chosen}

    def test_a_full_paper_passes(self, api, student, live_exam):
        response = sign_in(api, student()).post(submit_url("mock-1"), self.answers(live_exam, right=2), format="json")

        assert response.status_code == 200
        assert response.data["score"] == 2
        assert response.data["total"] == 2
        assert response.data["passed"] is True

    def test_too_few_right_answers_fails(self, api, student, live_exam):
        response = sign_in(api, student()).post(submit_url("mock-1"), self.answers(live_exam, right=1), format="json")

        assert response.data["score"] == 1
        assert response.data["passed"] is False
        assert response.data["passMark"] == 2

    def test_every_question_is_reported_back_with_its_answer(self, api, student, live_exam):
        """The student sees what they got wrong and why, which is the point of a mock."""
        response = sign_in(api, student()).post(submit_url("mock-1"), self.answers(live_exam, right=1), format="json")

        results = response.data["questions"]
        assert [result["key"] for result in results] == ["first", "second"]
        assert results[0]["correct"] is True
        assert results[1]["correct"] is False
        assert results[1]["correctIds"] == ["a"]

    def test_questions_left_unanswered_count_as_wrong(self, api, student, live_exam):
        """So a sitting cannot be improved by sending back fewer answers than there were questions."""
        response = sign_in(api, student()).post(submit_url("mock-1"), {"answers": {}}, format="json")

        assert response.data["score"] == 0
        assert response.data["total"] == 2
        assert response.data["passed"] is False
        assert all(result["selected"] == [] for result in response.data["questions"])

    def test_marking_happens_on_the_server(self, api, student, live_exam):
        """Claiming to have passed does not make it so."""
        submission = {**self.answers(live_exam, right=0), "score": 2, "passed": True}

        response = sign_in(api, student()).post(submit_url("mock-1"), submission, format="json")

        assert response.data["score"] == 0
        assert response.data["passed"] is False

    def test_answers_to_questions_outside_the_exam_are_ignored(self, api, student, live_exam):
        submission = {"answers": {**self.answers(live_exam, right=2)["answers"], "9999": ["a"]}}

        response = sign_in(api, student()).post(submit_url("mock-1"), submission, format="json")

        assert response.data["total"] == 2
        assert response.data["passed"] is True

    def test_a_submission_without_answers_is_refused(self, api, student, live_exam):
        response = sign_in(api, student()).post(submit_url("mock-1"), {}, format="json")

        assert response.status_code == 400

    def test_nonsense_instead_of_answers_is_refused(self, api, student, live_exam):
        response = sign_in(api, student()).post(submit_url("mock-1"), {"answers": {"1": "a"}}, format="json")

        assert response.status_code == 400

    def test_submitting_an_unknown_exam_is_not_found(self, api, student, live_exam):
        response = sign_in(api, student()).post(submit_url("nope"), {"answers": {}}, format="json")

        assert response.status_code == 404

    def test_a_lapsed_student_cannot_submit(self, api, student, live_exam):
        from datetime import timedelta

        lapsed = student(paid_at=timezone.now() - timedelta(days=60))

        response = sign_in(api, lapsed).post(submit_url("mock-1"), {"answers": {}}, format="json")

        assert response.status_code == 402

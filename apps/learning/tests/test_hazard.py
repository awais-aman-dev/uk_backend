"""Hazard perception: spotting a developing hazard, and being scored on how early.

The rule that matters most is that a student is never told when the hazards are. If the timings
reached the browser, the test would be a formality — so these tests check the payload itself, and
check that the scoring happens on the server.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.accounts.models import User
from apps.core.models import PublishStatus
from apps.learning import services
from apps.learning.models import (
    ContentType,
    HazardAttempt,
    HazardClip,
    HazardWindow,
    LearningContent,
    MediaAsset,
    MediaKind,
)
from apps.learning.tests.conftest import sign_in

pytestmark = pytest.mark.django_db

CLIPS_URL = reverse("learn-hazard-clips")
PROGRESS_URL = reverse("learn-progress")


def clip_url(slug: str) -> str:
    return reverse("learn-hazard-clip", args=[slug])


def attempt_url(slug: str) -> str:
    return reverse("learn-hazard-attempt", args=[slug])


@pytest.fixture
def clip_video(db):
    asset = MediaAsset.objects.create(title="Country lane", kind=MediaKind.VIDEO, duration_seconds=30)
    asset.file.save("lane.mp4", SimpleUploadedFile("lane.mp4", b"video bytes", content_type="video/mp4"), save=True)
    return asset


@pytest.fixture
def clip(clip_video):
    """A clip with one hazard between 10s and 15s, so each band is one second wide."""
    clip = HazardClip.objects.create(
        slug="country-lane", title="Country lane", description="A cyclist pulls out.", media=clip_video
    )
    HazardWindow.objects.create(clip=clip, label="Cyclist pulls out", starts_at="10.00", ends_at="15.00", order=1)
    return clip


@pytest.fixture
def live_clip(clip, publisher):
    services.publish(actor=publisher, instance=clip)
    clip.refresh_from_db()
    return clip


class TestScoringOneHazard:
    def test_spotting_it_at_the_very_start_scores_full_marks(self, clip):
        assert services.score_clip(clip, [10.0])["score"] == 5

    def test_each_band_is_worth_one_less(self, clip):
        """Five seconds divided into five bands: a second later is a mark lower."""
        scores = [services.score_clip(clip, [moment])["score"] for moment in (10.5, 11.5, 12.5, 13.5, 14.5)]

        assert scores == [5, 4, 3, 2, 1]

    def test_clicking_at_the_very_end_still_scores_one(self, clip):
        """The last instant belongs to the last band, not to the band past it."""
        assert services.score_clip(clip, [15.0])["score"] == 1

    def test_clicking_too_early_scores_nothing(self, clip):
        """Before the hazard develops it is a guess, not perception."""
        assert services.score_clip(clip, [9.9])["score"] == 0

    def test_clicking_too_late_scores_nothing(self, clip):
        assert services.score_clip(clip, [15.1])["score"] == 0

    def test_watching_without_clicking_scores_nothing(self, clip):
        result = services.score_clip(clip, [])

        assert result["score"] == 0
        assert result["hazards"][0]["spotted"] is False

    def test_the_best_click_counts_not_the_last(self, clip):
        """A second click at the same hazard neither helps nor hurts."""
        assert services.score_clip(clip, [10.5, 14.5])["score"] == 5

    def test_the_top_score_is_five_per_hazard(self, clip):
        HazardWindow.objects.create(clip=clip, label="Second hazard", starts_at="20.00", ends_at="25.00", order=2)

        assert clip.top_score == 10
        assert services.score_clip(clip, [10.0, 20.0])["score"] == 10

    def test_each_hazard_is_scored_separately(self, clip):
        HazardWindow.objects.create(clip=clip, label="Second hazard", starts_at="20.00", ends_at="25.00", order=2)

        result = services.score_clip(clip, [10.0, 24.0])

        assert [hazard["score"] for hazard in result["hazards"]] == [5, 1]
        assert result["score"] == 6


class TestClickingThroughIsRefused:
    def test_clicking_more_than_the_limit_scores_nothing(self, clip):
        """Otherwise clicking constantly would score full marks without spotting anything."""
        result = services.score_clip(clip, [float(n) / 10 for n in range(160)])

        assert result["voided"] is True
        assert result["score"] == 0

    def test_a_voided_attempt_marks_every_hazard_unspotted(self, clip):
        result = services.score_clip(clip, [float(n) / 10 for n in range(160)])

        assert all(not hazard["spotted"] for hazard in result["hazards"])

    def test_clicking_up_to_the_limit_is_fine(self, clip):
        result = services.score_clip(clip, [10.0] + [1.0] * (clip.max_clicks - 1))

        assert result["voided"] is False
        assert result["score"] == 5


class TestWhatMakesAClipUsable:
    def test_a_well_formed_clip_is_ready(self, clip):
        assert services.problems_with_clip(clip) == []

    def test_a_clip_with_no_hazards_is_refused(self, clip_video):
        """There would be nothing to spot, and every attempt would score nothing."""
        empty = HazardClip.objects.create(slug="empty", title="Empty", media=clip_video)

        assert "no hazards marked" in services.problems_with_clip(empty)[0]

    def test_a_clip_whose_file_is_not_a_video_is_refused(self, clip):
        clip.media.kind = MediaKind.DOCUMENT
        clip.media.save(update_fields=["kind"])

        assert "not a video" in services.problems_with_clip(clip)[0]

    def test_a_hazard_past_the_end_of_the_video_is_refused(self, clip):
        """It could never be spotted, so it would only lose students marks."""
        HazardWindow.objects.create(clip=clip, label="Too late", starts_at="29.00", ends_at="40.00", order=2)

        problems = services.problems_with_clip(clip)

        assert any("only 30s long" in problem for problem in problems)

    def test_overlapping_hazards_are_refused(self, clip):
        """One click would otherwise score for two hazards at once."""
        HazardWindow.objects.create(clip=clip, label="Overlapping", starts_at="14.00", ends_at="18.00", order=2)

        problems = services.problems_with_clip(clip)

        assert any("overlap" in problem for problem in problems)

    def test_a_hazard_cannot_end_before_it_starts(self, clip):
        from django.db.utils import IntegrityError

        with pytest.raises(IntegrityError):
            HazardWindow.objects.create(clip=clip, label="Backwards", starts_at="20.00", ends_at="19.00")

    def test_a_clip_that_would_not_work_cannot_be_published(self, publisher, clip_video):
        empty = HazardClip.objects.create(slug="empty", title="Empty", media=clip_video)

        with pytest.raises(services.NotReadyToPublishError, match="no hazards marked"):
            services.publish(actor=publisher, instance=empty)

    def test_an_editor_cannot_publish_a_clip(self, editor, clip):
        from apps.staff.authz import PermissionDeniedError

        with pytest.raises(PermissionDeniedError):
            services.publish(actor=editor, instance=clip)


class TestWhatTheStudentIsGiven:
    def test_the_hazard_timings_are_not_in_the_payload(self, clip):
        """Not hidden by the frontend: not sent at all. They would give away the answer."""
        view = services.student_view_of_clip(clip)

        assert "startsAt" not in str(view)
        assert "10.0" not in str(view)
        assert "Cyclist" not in str(view)

    def test_it_says_how_many_hazards_without_saying_when(self, clip):
        view = services.student_view_of_clip(clip)

        assert view["hazards"] == 1
        assert view["topScore"] == 5
        assert view["maxClicks"] == 15

    def test_it_carries_the_video_and_its_length(self, clip):
        view = services.student_view_of_clip(clip)

        assert view["url"]
        assert view["durationSeconds"] == 30


class TestTheEndpoints:
    def test_a_student_lists_the_clips(self, api, student, live_clip):
        response = sign_in(api, student()).get(CLIPS_URL)

        assert response.status_code == 200
        assert [item["slug"] for item in response.data["clips"]] == ["country-lane"]

    def test_the_listing_gives_nothing_away(self, api, student, live_clip):
        response = sign_in(api, student()).get(CLIPS_URL)

        assert "Cyclist" not in str(response.data)
        assert "startsAt" not in str(response.data)

    def test_draft_clips_are_not_listed(self, api, student, clip):
        assert sign_in(api, student()).get(CLIPS_URL).data["clips"] == []

    def test_a_student_opens_one_clip(self, api, student, live_clip):
        response = sign_in(api, student()).get(clip_url("country-lane"))

        assert response.status_code == 200
        assert response.data["title"] == "Country lane"

    def test_an_unknown_clip_is_not_found(self, api, student, live_clip):
        assert sign_in(api, student()).get(clip_url("no-such-clip")).status_code == 404

    def test_a_draft_clip_is_not_found(self, api, student, clip):
        assert sign_in(api, student()).get(clip_url("country-lane")).status_code == 404

    def test_somebody_without_a_plan_is_asked_to_buy_one(self, api, live_clip, db):
        browsing = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        assert sign_in(api, browsing).get(CLIPS_URL).status_code == 402

    def test_signed_out_visitors_are_refused(self, api, live_clip):
        assert api.get(CLIPS_URL).status_code == 401

    def test_submitting_an_attempt_scores_it(self, api, student, live_clip):
        response = sign_in(api, student()).post(attempt_url("country-lane"), {"clicks": [10.5]}, format="json")

        assert response.status_code == 200
        assert response.data["score"] == 5
        assert response.data["topScore"] == 5

    def test_the_timings_come_back_once_the_attempt_is_over(self, api, student, live_clip):
        """So the student can see what they missed, and when they should have clicked."""
        response = sign_in(api, student()).post(attempt_url("country-lane"), {"clicks": []}, format="json")

        hazard = response.data["hazards"][0]
        assert hazard["label"] == "Cyclist pulls out"
        assert hazard["startsAt"] == 10.0
        assert hazard["spotted"] is False

    def test_scoring_happens_on_the_server(self, api, student, live_clip):
        """Claiming a score does not earn it."""
        response = sign_in(api, student()).post(attempt_url("country-lane"), {"clicks": [], "score": 5}, format="json")

        assert response.data["score"] == 0

    def test_a_negative_click_time_is_refused(self, api, student, live_clip):
        response = sign_in(api, student()).post(attempt_url("country-lane"), {"clicks": [-1]}, format="json")

        assert response.status_code == 400

    def test_nonsense_instead_of_click_times_is_refused(self, api, student, live_clip):
        response = sign_in(api, student()).post(attempt_url("country-lane"), {"clicks": "early"}, format="json")

        assert response.status_code == 400

    def test_a_submission_with_no_clicks_field_is_refused(self, api, student, live_clip):
        assert sign_in(api, student()).post(attempt_url("country-lane"), {}, format="json").status_code == 400

    def test_a_lapsed_student_cannot_attempt_a_clip(self, api, student, live_clip):
        from datetime import timedelta

        from django.utils import timezone

        lapsed = student(paid_at=timezone.now() - timedelta(days=60))

        response = sign_in(api, lapsed).post(attempt_url("country-lane"), {"clicks": []}, format="json")

        assert response.status_code == 402


class TestAttemptsAreRemembered:
    def test_an_attempt_is_recorded(self, api, student, live_clip):
        learner = student()

        sign_in(api, learner).post(attempt_url("country-lane"), {"clicks": [10.5]}, format="json")

        attempt = HazardAttempt.objects.get(student=learner)
        assert (attempt.score, attempt.top_score, attempt.voided) == (5, 5, False)

    def test_a_voided_attempt_is_recorded_as_voided(self, api, student, live_clip):
        learner = student()
        clicks = [float(n) / 10 for n in range(160)]

        sign_in(api, learner).post(attempt_url("country-lane"), {"clicks": clicks}, format="json")

        assert HazardAttempt.objects.get(student=learner).voided is True

    def test_a_past_score_does_not_move_when_a_hazard_is_retimed(self, api, student, live_clip):
        """Retiming a hazard should not rewrite what a student already achieved."""
        learner = student()
        sign_in(api, learner).post(attempt_url("country-lane"), {"clicks": [10.5]}, format="json")

        live_clip.windows.update(starts_at="20.00", ends_at="25.00")

        assert HazardAttempt.objects.get(student=learner).score == 5

    def test_the_progress_summary_counts_them(self, api, student, live_clip):
        learner = sign_in(api, student())
        learner.post(attempt_url("country-lane"), {"clicks": [10.5]}, format="json")

        response = learner.get(PROGRESS_URL)

        assert response.data["hazardAttempts"] == 1
        assert response.data["bestHazardScore"] == 5


class TestHazardMaterialInLessons:
    def test_a_hazard_item_is_served_as_a_hazard_block(self, subchapter, live_clip):
        item = LearningContent.objects.create(
            subchapter=subchapter,
            slug="spot-the-hazard",
            title="Spot the hazard",
            content_type=ContentType.HAZARD,
            hazard_clip=live_clip,
        )

        assert services.block_for(item) == {
            "type": "hazard",
            "title": "Spot the hazard",
            "clips": ["country-lane"],
        }

    def test_a_lesson_sends_the_clip_with_the_block(
        self, api, student, published_tree, subchapter, live_clip, publisher
    ):
        """One response holds the lesson and the video URL it needs."""
        item = LearningContent.objects.create(
            subchapter=subchapter,
            slug="spot-the-hazard",
            title="Spot the hazard",
            content_type=ContentType.HAZARD,
            hazard_clip=live_clip,
            order=2,
        )
        services.publish(actor=publisher, instance=item)

        response = sign_in(api, student()).get(reverse("learn-lesson", args=[subchapter.slug]))

        assert response.data["clips"]["country-lane"]["url"]
        assert "Cyclist" not in str(response.data)

    def test_a_hazard_item_with_no_clip_cannot_be_published(self, publisher, subchapter):
        subchapter.status = PublishStatus.PUBLISHED
        subchapter.save(update_fields=["status"])
        item = LearningContent.objects.create(
            subchapter=subchapter, slug="empty", title="Empty", content_type=ContentType.HAZARD
        )

        with pytest.raises(services.NotReadyToPublishError, match="No hazard clip has been chosen"):
            services.publish(actor=publisher, instance=item)

    def test_a_hazard_item_pointing_at_a_draft_clip_cannot_be_published(self, publisher, subchapter, clip):
        subchapter.status = PublishStatus.PUBLISHED
        subchapter.save(update_fields=["status"])
        item = LearningContent.objects.create(
            subchapter=subchapter,
            slug="spot-the-hazard",
            title="Spot the hazard",
            content_type=ContentType.HAZARD,
            hazard_clip=clip,
        )

        with pytest.raises(services.NotReadyToPublishError, match="is not published yet"):
            services.publish(actor=publisher, instance=item)


class TestTheAdmin:
    def test_the_hazards_are_edited_beside_the_clip(self, editor_client, clip):
        page = editor_client.get(reverse("admin:learning_hazardclip_change", args=[clip.pk])).content.decode()

        assert "Cyclist pulls out" in page
        assert "starts_at" in page

    def test_the_form_spells_out_what_each_second_is_worth(self, editor_client, clip):
        """Staff should not have to work the bands out in their head."""
        page = editor_client.get(reverse("admin:learning_hazardclip_change", args=[clip.pk])).content.decode()

        assert "10.0s–11.0s = 5" in page
        assert "14.0s–15.0s = 1" in page

    def test_the_list_shows_how_many_hazards_and_the_top_score(self, editor_client, clip):
        page = editor_client.get(reverse("admin:learning_hazardclip_changelist")).content.decode()

        assert clip.title in page

    def test_the_preview_plays_the_clip_with_its_hazards_listed(self, editor_client, clip):
        """A mistimed window is otherwise invisible until students complain."""
        page = editor_client.get(reverse("admin:learning_hazardclip_preview", args=[clip.pk])).content.decode()

        assert "<video" in page
        assert "Cyclist pulls out" in page
        assert "10.0s to 15.0s" in page

    def test_the_preview_warns_about_what_would_stop_publishing(self, editor_client, clip_video):
        empty = HazardClip.objects.create(slug="empty", title="Empty", media=clip_video)

        page = editor_client.get(reverse("admin:learning_hazardclip_preview", args=[empty.pk])).content.decode()

        assert "no hazards marked" in page

    def test_attempts_are_shown_and_cannot_be_edited(self, publisher_client, student, live_clip):
        services.record_hazard_attempt(student(), live_clip, {"score": 4, "topScore": 5, "voided": False})

        page = publisher_client.get(reverse("admin:learning_hazardattempt_changelist")).content.decode()

        assert "4/5" in page
        assert publisher_client.get(reverse("admin:learning_hazardattempt_add")).status_code == 403

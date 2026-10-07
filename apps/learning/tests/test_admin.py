"""The custom parts of the Learning admin: the hierarchy, publish actions, editor and preview.

Standard Django CRUD is not re-tested here; only behaviour this project added.
"""

import pytest
from django.urls import reverse

from apps.core.models import PublishStatus
from apps.learning.models import LearningContent

from .conftest import CONTENT

pytestmark = pytest.mark.django_db

CONTENT_LIST = reverse("admin:learning_learningcontent_changelist")


def change_url(instance) -> str:
    meta = instance._meta
    return reverse(f"admin:{meta.app_label}_{meta.model_name}_change", args=[instance.pk])


def preview_url(instance) -> str:
    meta = instance._meta
    return reverse(f"admin:{meta.app_label}_{meta.model_name}_preview", args=[instance.pk])


def content_form(content, **overrides) -> dict:
    return {
        "subchapter": content.subchapter_id,
        "content_type": content.content_type,
        "title": content.title,
        "slug": content.slug,
        "order": content.order,
        "body_html": content.body_html,
        **overrides,
    }


class TestHierarchy:
    def test_a_chapter_lists_its_subchapters(self, editor_client, chapter, subchapter):
        page = editor_client.get(change_url(chapter)).content.decode()

        assert subchapter.title in page

    def test_a_subchapter_lists_its_material(self, editor_client, subchapter, content):
        page = editor_client.get(change_url(subchapter)).content.decode()

        assert content.title in page

    def test_material_is_written_on_its_own_page_not_in_the_inline(self, editor_client, subchapter, content):
        """A rich-text editor inside a nested inline is unusable, so the inline only links out."""
        inline_page = editor_client.get(change_url(subchapter)).content.decode()
        own_page = editor_client.get(change_url(content)).content.decode()

        assert "body_html" not in inline_page
        assert "ckeditor" in own_page.lower()

    def test_the_content_list_shows_where_each_item_sits(self, editor_client, content):
        page = editor_client.get(CONTENT_LIST).content.decode()

        assert content.subchapter.title in page
        assert content.subchapter.chapter.title in page

    def test_counts_show_how_much_is_published(self, editor_client, chapter, subchapter):
        page = editor_client.get(reverse("admin:learning_chapter_changelist")).content.decode()

        assert "0 published / 1 total" in page


class TestPublishAction:
    def publish(self, client, instance, action="publish_selected"):
        meta = instance._meta
        url = reverse(f"admin:{meta.app_label}_{meta.model_name}_changelist")
        return client.post(url, {"action": action, "_selected_action": [instance.pk]}, follow=True)

    def test_a_publisher_can_publish_from_the_list(self, publisher_client, subchapter, content):
        subchapter.status = PublishStatus.PUBLISHED
        subchapter.save(update_fields=["status"])

        self.publish(publisher_client, content)

        content.refresh_from_db()
        assert content.status == PublishStatus.PUBLISHED

    def test_the_action_is_hidden_from_editors(self, editor_client, content):
        page = editor_client.get(CONTENT_LIST).content.decode()

        assert "publish_selected" not in page

    def test_an_editor_posting_the_action_anyway_changes_nothing(self, editor_client, subchapter, content):
        subchapter.status = PublishStatus.PUBLISHED
        subchapter.save(update_fields=["status"])

        self.publish(editor_client, content)

        content.refresh_from_db()
        assert content.status == PublishStatus.DRAFT

    def test_material_that_is_not_ready_reports_why(self, publisher_client, content):
        response = self.publish(publisher_client, content)

        assert "not published" in response.content.decode()
        content.refresh_from_db()
        assert content.status == PublishStatus.DRAFT

    def test_unpublishing_takes_it_off_the_site(self, publisher_client, published_tree):
        _, _, content = published_tree

        self.publish(publisher_client, content, "unpublish_selected")

        content.refresh_from_db()
        assert content.status == PublishStatus.DRAFT


class TestRichTextEditor:
    def test_material_written_in_the_editor_is_saved(self, editor_client, content):
        written = "<h2>Speed limits</h2><p>Thirty unless signed otherwise.</p>"

        editor_client.post(change_url(content), content_form(content, body_html=written))

        content.refresh_from_db()
        assert content.body_html == written

    def test_dangerous_markup_never_reaches_the_database(self, editor_client, content):
        """Whatever was pasted into the editor, what is stored is what students can be served."""
        editor_client.post(change_url(content), content_form(content, body_html="<p>Fine</p><script>steal()</script>"))

        content.refresh_from_db()
        assert content.body_html == "<p>Fine</p>"

    def test_only_the_kinds_of_material_we_can_serve_are_offered(self, editor_client, content):
        """Hazard is in the model for later; offering it would create dead items."""
        page = editor_client.get(change_url(content)).content.decode()

        assert 'value="theory"' in page
        assert 'value="hazard"' not in page


class TestAccess:
    def test_the_package_picker_is_on_the_form(self, editor_client, content):
        page = editor_client.get(change_url(content)).content.decode()

        assert "only_for_packages" in page
        assert "Leave empty for everyone with learning access." in page


class TestScheduling:
    def test_the_publish_from_field_is_on_the_form(self, editor_client, content):
        page = editor_client.get(change_url(content)).content.decode()

        assert "publish_from" in page

    def test_scheduled_material_is_shown_as_scheduled(self, editor_client, published_tree):
        from datetime import timedelta

        from django.utils import timezone

        _, _, content = published_tree
        content.publish_from = timezone.now() + timedelta(days=1)
        content.save(update_fields=["publish_from"])

        page = editor_client.get(CONTENT_LIST).content.decode()

        assert "Scheduled" in page


class TestPreview:
    def test_a_subchapter_preview_shows_its_published_material(self, editor_client, published_tree):
        _, subchapter, content = published_tree

        page = editor_client.get(preview_url(subchapter)).content.decode()

        assert "Thinking distance plus braking distance." in page
        assert subchapter.title in page

    def test_the_preview_renders_html_rather_than_showing_tags(self, editor_client, published_tree):
        _, subchapter, _ = published_tree

        page = editor_client.get(preview_url(subchapter)).content.decode()

        assert CONTENT in page
        assert "&lt;p&gt;" not in page

    def test_draft_material_is_left_out_of_the_preview(self, editor_client, published_tree, subchapter):
        LearningContent.objects.create(subchapter=subchapter, slug="draft", title="Draft", body_html="<p>Not yet.</p>")

        page = editor_client.get(preview_url(subchapter)).content.decode()

        assert "Not yet." not in page

    def test_it_warns_about_what_would_stop_publishing(self, editor_client, subchapter):
        page = editor_client.get(preview_url(subchapter)).content.decode()

        assert "cannot be published yet" in page

    def test_staff_without_learning_permissions_are_refused(self, client, outsider, content):
        """A custom page needs its own check; being in the admin is not enough."""
        client.force_login(outsider)

        assert client.get(preview_url(content)).status_code == 403

    def test_signed_out_visitors_are_sent_to_the_login_page(self, client, content):
        response = client.get(preview_url(content))

        assert response.status_code == 302
        assert "login" in response["Location"]


class TestMenu:
    def test_an_editor_sees_learning_and_not_the_crm(self, editor_client):
        shown = {app["app_label"] for app in editor_client.get(reverse("admin:index")).context["available_apps"]}

        assert "learning" in shown
        assert "crm" not in shown

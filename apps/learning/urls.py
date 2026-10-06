from django.urls import path

from apps.learning import api

urlpatterns = [
    # The frontend's own words: a chapter is a "topic" and a subchapter is a "lesson".
    path("learn/topics/", api.TopicListView.as_view(), name="learn-topics"),
    path("learn/lessons/<slug:slug>/", api.LessonDetailView.as_view(), name="learn-lesson"),
    path("learn/ebook/", api.EbookView.as_view(), name="learn-ebook"),
    path("learn/ebook/<slug:slug>/", api.EbookChapterView.as_view(), name="learn-ebook-chapter"),
    path("learn/signs/", api.SignListView.as_view(), name="learn-signs"),
]

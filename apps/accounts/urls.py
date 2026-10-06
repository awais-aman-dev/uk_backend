from django.urls import path

from apps.accounts import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/google/", views.GoogleSignInView.as_view(), name="auth-google"),
    path("auth/google/link/", views.GoogleLinkView.as_view(), name="auth-google-link"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/token/refresh/", views.TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/email/verify/", views.EmailVerifyView.as_view(), name="auth-email-verify"),
    path("auth/email/verify/resend/", views.EmailVerifyResendView.as_view(), name="auth-email-verify-resend"),
    path("auth/password/reset/", views.PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "auth/password/reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
]

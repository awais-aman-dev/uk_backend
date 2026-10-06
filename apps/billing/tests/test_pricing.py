"""Promo codes and the prices they produce."""

from decimal import Decimal

import pytest
from django.db.utils import IntegrityError
from django.urls import reverse

from apps.billing.models import DiscountType, PromoCode
from apps.billing.pricing import quote

pytestmark = pytest.mark.django_db

VALIDATE_URL = reverse("promo-code-validate")


class TestDiscountMaths:
    def test_percentage_off(self, package, make_promo_code):
        code = make_promo_code(discount_value=Decimal("10"))

        assert code.discount_for(package.price) == Decimal("3.00")

    def test_percentage_is_rounded_to_whole_pence(self, package, make_promo_code):
        """33% of £29.99 is £9.8967, which has to become a real amount of money."""
        code = make_promo_code(discount_value=Decimal("33"))

        assert code.discount_for(package.price) == Decimal("9.90")

    def test_fixed_amount_off(self, package, make_promo_code):
        code = make_promo_code(discount_type=DiscountType.FIXED, discount_value=Decimal("5.00"))

        assert code.discount_for(package.price) == Decimal("5.00")

    def test_fixed_amount_never_exceeds_the_price(self, package, make_promo_code):
        """Otherwise the order total would go negative and we would owe the customer money."""
        code = make_promo_code(discount_type=DiscountType.FIXED, discount_value=Decimal("100.00"))

        assert code.discount_for(package.price) == package.price


class TestUsability:
    def test_active_code_is_usable(self, make_promo_code):
        assert make_promo_code().is_usable() is True

    def test_inactive_code_is_not(self, make_promo_code):
        assert make_promo_code(is_active=False).is_usable() is False

    def test_code_that_has_not_started_is_not(self, make_promo_code, tomorrow):
        """valid_from was ignored before, so codes worked before their campaign began."""
        assert make_promo_code(valid_from=tomorrow).is_usable() is False

    def test_expired_code_is_not(self, make_promo_code, yesterday):
        assert make_promo_code(valid_until=yesterday).is_usable() is False

    def test_code_within_its_window_is(self, make_promo_code, yesterday, tomorrow):
        assert make_promo_code(valid_from=yesterday, valid_until=tomorrow).is_usable() is True

    def test_used_up_code_is_not(self, make_promo_code):
        code = make_promo_code(max_uses=2)
        PromoCode.objects.filter(pk=code.pk).update(uses_count=2)
        code.refresh_from_db()

        assert code.is_usable() is False

    def test_code_with_uses_left_is(self, make_promo_code):
        code = make_promo_code(max_uses=2)
        PromoCode.objects.filter(pk=code.pk).update(uses_count=1)
        code.refresh_from_db()

        assert code.is_usable() is True

    def test_blank_max_uses_means_unlimited(self, make_promo_code):
        code = make_promo_code(max_uses=None)
        PromoCode.objects.filter(pk=code.pk).update(uses_count=10_000)
        code.refresh_from_db()

        assert code.is_usable() is True


class TestStoredCodes:
    def test_code_is_stored_in_capitals(self, make_promo_code):
        assert make_promo_code(code=" save10 ").code == "SAVE10"

    def test_two_codes_cannot_differ_only_in_case(self, make_promo_code):
        make_promo_code(code="SAVE10")

        with pytest.raises(IntegrityError):
            PromoCode.objects.create(code="save10", discount_value=Decimal("5"))

    @pytest.mark.parametrize("value", [Decimal("0"), Decimal("-5")])
    def test_a_discount_must_be_positive(self, value):
        with pytest.raises(IntegrityError):
            PromoCode.objects.create(code="FREEBIE", discount_value=value)

    def test_a_percentage_over_100_cannot_be_saved(self):
        """It would make the total negative."""
        with pytest.raises(IntegrityError):
            PromoCode.objects.create(
                code="TOOMUCH", discount_type=DiscountType.PERCENTAGE, discount_value=Decimal("101")
            )

    def test_a_fixed_amount_over_100_is_fine(self):
        """£150 off is a sensible thing to offer; 150% is not."""
        code = PromoCode.objects.create(code="BIGONE", discount_type=DiscountType.FIXED, discount_value=Decimal("150"))

        assert code.pk is not None


class TestQuote:
    def test_no_code_means_full_price(self, package):
        priced = quote(package)

        assert priced.discount_amount == Decimal("0.00")
        assert priced.final_price == package.price
        assert priced.promo_code is None

    def test_a_usable_code_reduces_the_price(self, package, promo_code):
        priced = quote(package, "SAVE10")

        assert priced.discount_amount == Decimal("3.00")
        assert priced.final_price == Decimal("26.99")
        assert priced.promo_code == promo_code

    def test_matching_ignores_case(self, package, promo_code):
        assert quote(package, "save10").final_price == Decimal("26.99")

    def test_surrounding_spaces_are_ignored(self, package, promo_code):
        assert quote(package, "  SAVE10 ").final_price == Decimal("26.99")

    @pytest.mark.parametrize("code", ["", "   ", "NOSUCHCODE"])
    def test_an_unusable_code_is_ignored_rather_than_rejected(self, package, code):
        """Checkout must still go through, at full price."""
        priced = quote(package, code)

        assert priced.final_price == package.price
        assert priced.promo_code is None


class TestValidateEndpoint:
    def test_valid_code_returns_the_prices_as_strings(self, api, package, promo_code):
        response = api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "SAVE10"}, format="json")

        assert response.status_code == 200
        assert response.data == {
            "valid": True,
            "discount_type": "percentage",
            "discount_value": "10.00",
            "discount_amount": "3.00",
            "original_price": "29.99",
            "final_price": "26.99",
        }

    @pytest.mark.parametrize(
        "code_fields",
        [
            {"is_active": False},
            {"max_uses": 0},
        ],
        ids=["inactive", "used up"],
    )
    def test_unusable_codes_are_refused(self, api, package, make_promo_code, code_fields):
        make_promo_code(code="NOPE", **code_fields)

        response = api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "NOPE"}, format="json")

        assert response.status_code == 400
        assert response.data == {"valid": False, "detail": "Invalid or expired promo code."}

    def test_code_that_has_not_started_is_refused(self, api, package, make_promo_code, tomorrow):
        make_promo_code(code="SOON", valid_from=tomorrow)

        response = api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "SOON"}, format="json")

        assert response.status_code == 400

    def test_expired_code_is_refused(self, api, package, make_promo_code, yesterday):
        make_promo_code(code="OVER", valid_until=yesterday)

        response = api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "OVER"}, format="json")

        assert response.status_code == 400

    def test_unknown_code_is_refused(self, api, package):
        response = api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "MADEUP"}, format="json")

        assert response.status_code == 400

    def test_unknown_package_returns_404(self, api, promo_code):
        response = api.post(VALIDATE_URL, {"package_id": 9999, "promo_code": "SAVE10"}, format="json")

        assert response.status_code == 404

    def test_inactive_package_returns_404(self, api, package, promo_code):
        package.is_active = False
        package.save(update_fields=["is_active"])

        response = api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "SAVE10"}, format="json")

        assert response.status_code == 404

    def test_checking_a_code_does_not_use_it_up(self, api, package, promo_code):
        api.post(VALIDATE_URL, {"package_id": package.pk, "promo_code": "SAVE10"}, format="json")

        promo_code.refresh_from_db()
        assert promo_code.uses_count == 0

    def test_is_throttled(self, api, package, promo_code):
        """Otherwise the endpoint is a way to guess promo codes."""
        payload = {"package_id": package.pk, "promo_code": "SAVE10"}
        for _ in range(60):
            api.post(VALIDATE_URL, payload, format="json")

        response = api.post(VALIDATE_URL, payload, format="json")

        assert response.status_code == 429

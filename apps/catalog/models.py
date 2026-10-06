from django.db import models
from django.utils.text import slugify

from apps.core.models import TimestampedModel


class Package(TimestampedModel):
    """A length of access to the learning material, sold as a one-off purchase.

    Prices are in pounds sterling; there is no currency field because the product only sells in
    the UK. Packages differ only in how long access lasts, not in what it unlocks.
    """

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True, help_text="Left blank, this is made from the name.")
    description = models.TextField(blank=True)
    duration_days = models.PositiveIntegerField(help_text="How long access lasts, in days (30, 60, 90).")
    price = models.DecimalField(max_digits=8, decimal_places=2, help_text="In GBP.")

    is_featured = models.BooleanField(default=False, help_text='Shown as "most popular" on the storefront.')
    is_active = models.BooleanField(default=True, help_text="Inactive packages are hidden and cannot be bought.")

    # Marketing copy only: a list of strings shown as bullet points. It does not control access.
    materials = models.JSONField(default=list, blank=True, help_text="Bullet list of what is included.")
    display_order = models.PositiveSmallIntegerField(default=0, help_text="Lower numbers come first.")

    class Meta:
        ordering = ["display_order", "price"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

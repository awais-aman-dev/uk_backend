"""Cleaning the HTML staff write.

Content is written in a rich-text editor, so what arrives is HTML. It is cleaned before it is
stored, never on the way out, so what is in the database is exactly what students will be served
and nothing dangerous can sit there waiting for a page that forgets to escape it.

Cleaning is not only about attacks. Pasting from Word brings a mess of styling that would fight
the site's own design, so anything not on the list below is dropped and the text is kept.
"""

import nh3

# What a lesson or chapter may contain. Headings start at h2, because the page itself provides
# the h1, and a second h1 in the content would confuse screen readers and search engines.
ALLOWED_TAGS = {
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "sub",
    "sup",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "img",
    "hr",
    "code",
    "pre",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "width", "height"},
    "th": {"colspan", "rowspan", "scope"},
    "td": {"colspan", "rowspan"},
    # The editor marks image and table alignment with a class.
    "figure": {"class"},
    "table": {"class"},
}

# Only links that go somewhere safe. This is what stops `javascript:` links.
ALLOWED_SCHEMES = {"http", "https", "mailto"}


def clean(html: str | None) -> str:
    """Return the HTML with anything we do not allow removed."""
    if not html:
        return ""

    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes={tag: set(attributes) for tag, attributes in ALLOWED_ATTRIBUTES.items()},
        url_schemes=ALLOWED_SCHEMES,
        link_rel="noopener noreferrer",
    )


def is_empty(html: str | None) -> bool:
    """Whether this is really empty, seeing past the markup an editor leaves behind.

    A rich-text editor rarely hands back an empty string: pressing a key and deleting it leaves
    something like ``<p>&nbsp;</p>``, which looks blank to staff and should count as blank here.
    """
    if not html:
        return True

    text = nh3.clean(html, tags=set()).replace("&nbsp;", " ")
    return not text.strip()

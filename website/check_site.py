#!/usr/bin/env python3
"""Dependency-free structural and local asset checks for the static website."""
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.local = []
        self.fragments = []
        self.meta = set()
        self.tags = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        self.tags.add(tag)

        if attributes.get("id"):
            self.ids.add(attributes["id"])

        if tag == "meta" and attributes.get("name"):
            self.meta.add(attributes["name"])
        if tag == "meta" and attributes.get("property"):
            self.meta.add(attributes["property"])

        href = attributes.get("href", "")
        if href.startswith("#") and len(href) > 1:
            self.fragments.append(href[1:])

        for attr in ("href", "src"):
            value = attributes.get(attr, "")
            if value and not value.startswith(("https://", "http://", "mailto:", "#", "data:")):
                self.local.append(value)


html = (ROOT / "index.html").read_text(encoding="utf-8")
if r"\n" in html:
    sys.exit("HTML contains literal escaped newline sequences; use real line breaks")

parser = SiteParser()
parser.feed(html)

required_ids = {"main", "runtime", "features", "desktop", "terminal", "downloads", "docs"}
missing = required_ids - parser.ids
if missing:
    sys.exit(f"missing section anchors: {sorted(missing)}")

missing_fragments = set(parser.fragments) - parser.ids
if missing_fragments:
    sys.exit(f"links point to missing anchors: {sorted(missing_fragments)}")

required_meta = {"description", "og:title", "og:description", "og:image", "twitter:card"}
if not required_meta <= parser.meta:
    sys.exit("SEO/Open Graph metadata is incomplete")

if not {"main", "nav", "header", "footer", "section"} <= parser.tags:
    sys.exit("semantic landmarks are incomplete")

for path in parser.local:
    target = (ROOT / path.split("#")[0]).resolve()
    if not target.is_relative_to(ROOT.resolve()) or not target.exists():
        sys.exit(f"missing or unsafe local asset: {path}")

required_files = (
    "styles.css",
    "script.js",
    "assets/anime.min.js",
    "assets/anime.LICENSE.md",
    "assets/favicon.svg",
    "assets/desktop-launcher.png",
    "assets/stubuika-paper-landscape.jpg",
)
for filename in required_files:
    if not (ROOT / filename).is_file():
        sys.exit(f"missing required site file: {filename}")

html_text = html
if "assets/anime.min.js" not in html_text or "assets/anime.LICENSE.md" not in str(required_files):
    sys.exit("Anime.js asset is not wired into the page")
if 'id="release-list"' not in html_text or 'id="release-status"' not in html_text:
    sys.exit("live release panel markup is missing")

print(f"Website checks passed ({len(parser.local)} local asset references, {len(parser.fragments)} anchor links)")

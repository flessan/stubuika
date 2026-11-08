#!/usr/bin/env python3
"""Dependency-free structural and local asset checks for the static website."""
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set(); self.local = []; self.meta = set(); self.tags = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); self.tags.add(tag)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'meta' and a.get('name'): self.meta.add(a['name'])
        if tag == 'meta' and a.get('property'): self.meta.add(a['property'])
        for attr in ('href', 'src'):
            value = a.get(attr, '')
            if value and not value.startswith(('https://', 'http://', 'mailto:', '#', 'data:')):
                self.local.append(value)

html = (ROOT / 'index.html').read_text(encoding='utf-8')
p = SiteParser(); p.feed(html)
required_ids = {'main', 'about', 'features', 'terminal', 'downloads', 'docs'}
missing = required_ids - p.ids
if missing: sys.exit(f'missing section anchors: {sorted(missing)}')
if not {'description', 'og:title', 'og:description', 'og:image', 'twitter:card'} <= p.meta:
    sys.exit('SEO/Open Graph metadata is incomplete')
if not {'main', 'nav', 'header', 'footer', 'section'} <= p.tags:
    sys.exit('semantic landmarks are incomplete')
for path in p.local:
    target = (ROOT / path.split('#')[0]).resolve()
    if not target.is_relative_to(ROOT.resolve()) or not target.exists():
        sys.exit(f'missing or unsafe local asset: {path}')
for filename in ('styles.css', 'script.js', 'assets/favicon.svg', 'assets/desktop-launcher.png', 'assets/stubuika-paper-landscape.jpg'):
    if not (ROOT / filename).is_file(): sys.exit(f'missing required site file: {filename}')
print(f'Website checks passed ({len(p.local)} local asset references)')

# Stubuika website

This directory is a static landing page, isolated from the native runtime build. It can be previewed locally with any static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory website
```

The release panel queries the public GitHub Releases API at page load and links only to assets returned by GitHub. Run `python3 website/check_site.py` and `node --check website/script.js` to validate the site. The directory is ready to publish as a static site (GitHub Pages / Cloudflare Pages can use `website/` as the published source).

## Design

The page is styled as a papercraft poster, following the supplied references:

- A sky-blue hero with halftone clouds, layered paper hills, and torn-paper edges (in the spirit of the Craft landing page).
- The Stubuika paper-cut landscape is **not an image**: it is rebuilt natively as inline SVG + CSS (`.paper-scene`) — gradient paper sky, cut-out clouds, four layered hills, grass tufts, the pink/yellow/blue cube, and the multicolour wordmark as stroked SVG letters with a white sticker outline. Its layers parallax and its letters pop in with scroll. A miniature of the same native scene appears in the lineage section. The original JPG remains only as the social/OG preview card.
- The wordmark artwork's palette — teal, yellow, purple, blue, pink on grass green — is reused for sticker cards, note cards, and guide tiles across the page.
- A floating frosted-glass pill navigation with a dark call-to-action button, echoing the reference layout without copying its content or branding.

The desktop launcher image is from the repository's existing `shots/launcher.png`. The terminal panel is an explicitly labeled interface preview, not a captured runtime screenshot.

## Animation — a scroll film

Motion is powered by [Anime.js](https://animejs.com) 3.2.2, vendored at `assets/anime.min.js` (MIT License, `assets/anime.LICENSE.md`) — no CDN, no build step. Nothing autoplays and nothing is pinned: every Anime.js timeline is paused and `seek()`-ed from scroll position, and progress is computed from layout offsets (`offsetTop`), which transforms cannot change, so an animated element can never feed back into its own progress (the classic cause of scroll jitter).

- **Hero journey:** scrolling sends the paper cube rolling and hopping across the valley while clouds and hills parallax and the headline lifts away.
- **Companion cube:** a fixed cube rides a rainbow paper trail at the edge of the viewport down the whole page, rotating as it goes, with a chapter label (SKY → RUNTIME → FEATURES → …) tracking where you are.
- **Marquee band:** the formats/hosts ticker slides in proportion to overall page progress.
- **Scenes:** runtime steps activate in sequence with a filling progress line; feature note cards cascade; terminal lines arrive in order; the giant STUBUIKA letters bounce in one by one; live release cards join the same scrub system when they render.
- A rainbow progress strip at the top tracks total progress.

Motion runs for every visitor (no reduced-motion gating, per project direction) and all content remains fully readable if JavaScript or Anime.js fails to load.

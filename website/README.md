# Stubuika website

This directory is a static landing page, isolated from the native runtime build. It can be previewed locally with any static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory website
```

The release panel queries the public GitHub Releases API at page load and links only to assets returned by GitHub. Run `python3 website/check_site.py` and `node --check website/script.js` to validate the site. The directory is ready to publish as a static site (GitHub Pages / Cloudflare Pages can use `website/` as the published source).

## Design

The page is styled as a papercraft poster, following the supplied references:

- A sky-blue hero with halftone clouds, layered paper hills, and torn-paper edges (in the spirit of the Craft landing page), carrying the Stubuika paper-cut landscape inside a desktop-window card.
- The wordmark artwork's palette — teal, yellow, purple, blue, pink on grass green — is reused for sticker cards, note cards, and guide tiles across the page.
- A floating frosted-glass pill navigation with a dark call-to-action button, echoing the reference layout without copying its content or branding.

The desktop launcher image is from the repository's existing `shots/launcher.png`. The terminal panel is an explicitly labeled interface preview, not a captured runtime screenshot.

## Animation — scroll-driven

Motion is powered by [Anime.js](https://animejs.com) 3.2.2, vendored at `assets/anime.min.js` (MIT License, `assets/anime.LICENSE.md`) so the site works offline with no CDN dependency. Nothing autoplays: every Anime.js timeline is paused and `seek()`-ed from the scroll position, so the visitor drives the storyboard.

- **Hero journey:** scrolling sends the paper cube rolling across the valley (with hops), while clouds and hills parallax, the headline lifts away, and the window card settles.
- **Runtime scene (pinned):** the three pipeline steps light up in sequence and the progress line fills as you scroll through the scene.
- **Feature rail (pinned):** the note cards ride a horizontal rail scrubbed by scroll.
- **Terminal:** lines "type in" in proportion to scroll, and all remaining cards scrub in as they enter the viewport.
- A rainbow scroll-progress strip at the top of the viewport tracks overall progress.

Pinned scenes and the rail are disabled on narrow screens, all motion is progressive enhancement (content is fully visible if JavaScript or Anime.js fails to load), and everything is skipped when the visitor prefers reduced motion.

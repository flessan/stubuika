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

## Animation — a scroll film (damped scrub)

Motion is powered by [Anime.js](https://animejs.com) 3.2.2, vendored at `assets/anime.min.js` (MIT License, `assets/anime.LICENSE.md`) — no CDN, no build step. The wordmark uses **Baloo 2** (`assets/baloo-2-*.woff2`, SIL OFL 1.1, `assets/baloo-2.LICENSE.md`), a chunky rounded font matching the artwork's lettering.

The scroll engine follows current best practice for butter-smooth scroll animation:

- **Native scroll stays native; animation values are damped.** Every driver's progress chases its scroll target with a lerp (`cur += (target - cur) * 0.085`, the cinematic range used by smooth-scroll libraries), so motion glides and settles instead of snapping to the raw scroll position.
- **One `requestAnimationFrame` loop** starts on scroll/resize and stops once all drivers settle — no idle CPU burn, no scroll-event storms (passive listeners only).
- **Transform/opacity only**, with progress computed from layout offsets cached on resize/load/fonts-ready, so animated elements can never feed back into their own progress.
- **Native CSS scroll-timelines** drive the top progress bar on the compositor where supported (`@supports (animation-timeline: scroll())`); the JS engine detects that and leaves the bar alone there.
- Scroll velocity adds a subtle skew to the marquee; the companion cube, chapter label (with matching active-nav highlighting), and a back-to-top paper button all ride the same smoothed progress.

Scenes: the hero paper valley (native SVG, see Design) parallaxes while its cube hops and its letters pop in; runtime steps activate in sequence; feature cards cascade; terminal lines arrive in order; the giant STUBUIKA letters bounce in; live release cards join the same scrub system when they render. All content remains fully readable if JavaScript or Anime.js fails to load.

## Modern Web Guidance

This site follows Google Chrome's [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) (searched/retrieved with `npx modern-web-guidance` during development):

- **Scrollspy** is an `IntersectionObserver` with a `-45%/-50%` root margin, and the active nav link's visual state is mirrored with `aria-current="true"` for assistive technology.
- **Parallax/scroll effects** animate only compositor properties (`transform`, `opacity`); the top progress bar uses the native CSS `scroll()` timeline where supported (declared after the `animation` shorthand so it is not reset), with the damped JS engine as the cross-browser driver.
- **Responsive components** use container queries (`.section-inner` is the container) so cards respond to their own space, with viewport media queries as the base layer.
- **Performance:** the above-the-fold brand font (Baloo 2 800) is preloaded; below-fold images use `loading="lazy"`, `decoding="async"`, and `fetchpriority="low"`. `content-visibility` is deliberately *not* used: the guidance reserves it for large complex pages, and this page's cached-offset scroll engine depends on stable layout.
- Project motion policy (explicit, per site owner): scroll animations run for every visitor; there is no reduced-motion gate.

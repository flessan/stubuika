# Stubuika website

This directory is a dependency-free static landing page, isolated from the native runtime build. It can be previewed locally with any static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory website
```

The release panel queries the public GitHub Releases API at page load and links only to assets returned by GitHub. The site has no build step; run `python3 website/check_site.py` and `node --check website/script.js` to validate it. The directory is ready to publish as a static site (GitHub Pages can use `website/` as the published source).

The supplied Stubuika paper-cut landscape is the primary hero and Open Graph artwork; it is optimized as a 102 KB JPEG for the static site. CSS paper layers carry its palette through the rest of the page. The terminal panel is an explicitly labeled interface preview, not a captured runtime screenshot. The desktop launcher image is from the repository's existing `shots/launcher.png`.

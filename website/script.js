(() => {
  /* ---------------- navigation ---------------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-nav');

  const closeNav = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
  };

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav?.classList.toggle('is-open', open);
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeNav(); toggle?.focus(); }
  });
  document.addEventListener('click', event => {
    if (!nav?.classList.contains('is-open')) return;
    if (event.target instanceof Node && !nav.contains(event.target) && !toggle?.contains(event.target)) closeNav();
  });

  /* ---------------- live GitHub releases ---------------- */
  const releaseList = document.querySelector('#release-list');
  const releaseStatus = document.querySelector('#release-status');
  const repository = 'https://github.com/flessan/stubuika';

  const platformLabel = filename => {
    const name = filename.toLowerCase();
    if (/\.dmg$|\.pkg$|macos|darwin/.test(name)) return 'macOS';
    if (/\.exe$|\.msi$|windows|win32|win64/.test(name)) return 'Windows';
    if (/\.deb$|\.rpm$|\.appimage$|linux/.test(name)) return 'Linux';
    return 'Package';
  };

  const formatBytes = value => {
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value >= 1024 * 1024 * 1024) return (value / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (value >= 1024 * 1024) return Math.round(value / (1024 * 1024)) + ' MB';
    return Math.max(1, Math.round(value / 1024)) + ' KB';
  };

  const formatDate = value => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return '';
    return new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'short', day: 'numeric'}).format(date);
  };

  const safeGithubLink = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'github.com' || url.hostname.endsWith('.githubusercontent.com')) ? url.href : null;
    } catch { return null; }
  };

  const setStatus = (label, state) => {
    if (!releaseStatus) return;
    releaseStatus.classList.remove('is-ready', 'is-error');
    if (state) releaseStatus.classList.add(state);
    const dot = document.createElement('i');
    const text = document.createElement('span');
    text.textContent = label;
    releaseStatus.replaceChildren(dot, text);
  };

  const renderRelease = release => {
    const card = document.createElement('article');
    card.className = 'release-card scrub-item';

    const meta = document.createElement('div');
    meta.className = 'release-meta';
    const version = document.createElement('div');
    version.className = 'release-version';
    const title = document.createElement('h3');
    title.textContent = release.name || release.tag_name || 'Stubuika release';
    version.append(title);
    if (release.prerelease) {
      const badge = document.createElement('span');
      badge.className = 'release-badge';
      badge.textContent = 'Pre-release';
      version.append(badge);
    }
    const date = document.createElement('p');
    date.textContent = [release.tag_name, formatDate(release.published_at || release.created_at)].filter(Boolean).join('  /  ');
    meta.append(version, date);

    const assets = document.createElement('div');
    assets.className = 'asset-links';
    const listed = (release.assets || []).filter(asset => safeGithubLink(asset.browser_download_url));
    listed.forEach(asset => {
      const link = document.createElement('a');
      link.className = 'asset-link';
      link.href = safeGithubLink(asset.browser_download_url);
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.setAttribute('aria-label', 'Download ' + asset.name + ' for ' + release.tag_name);
      const platform = document.createElement('span');
      platform.textContent = platformLabel(asset.name);
      const size = document.createElement('small');
      size.textContent = formatBytes(asset.size);
      link.append(platform);
      if (size.textContent) link.append(size);
      assets.append(link);
    });
    if (!listed.length) {
      const notes = document.createElement('a');
      notes.className = 'asset-link';
      notes.href = safeGithubLink(release.html_url) || repository + '/releases';
      notes.target = '_blank';
      notes.rel = 'noreferrer';
      notes.textContent = 'Release notes';
      assets.append(notes);
    }
    card.append(meta, assets);
    return card;
  };

  const renderReleases = releases => {
    if (!releaseList) return;
    const published = releases.filter(release => !release.draft);
    if (!published.length) {
      const empty = document.createElement('p');
      empty.className = 'release-empty';
      empty.textContent = 'There are no published releases yet. You can still build Stubuika from source or follow development on GitHub.';
      releaseList.replaceChildren(empty);
      setStatus('No published releases', 'is-ready');
      return;
    }
    const sorted = published.sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));
    releaseList.replaceChildren(...sorted.slice(0, 3).map(renderRelease));
    setStatus('Live from GitHub', 'is-ready');
    registerItems(releaseList.querySelectorAll('.scrub-item'));
    requestUpdate();
  };

  if (releaseList) {
    fetch('https://api.github.com/repos/flessan/stubuika/releases?per_page=12', {
      headers: {Accept: 'application/vnd.github+json'}
    })
      .then(response => {
        if (!response.ok) throw new Error('GitHub returned ' + response.status);
        return response.json();
      })
      .then(renderReleases)
      .catch(() => {
        const empty = document.createElement('p');
        empty.className = 'release-empty';
        empty.append('Release information is temporarily unavailable. ');
        const link = document.createElement('a');
        link.href = repository + '/releases';
        link.textContent = 'Browse releases on GitHub';
        empty.append(link);
        releaseList.replaceChildren(empty);
        setStatus('Could not connect', 'is-error');
      });
  }

  /* ================= scroll-driven motion (Anime.js) =================
     No autoplay, no loops: every timeline is paused and seek()-ed from
     the scroll position, so the page is a storyboard the visitor drives.
     Without Anime.js / with reduced motion, content simply stays put. */
  const anime = window.anime;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drivers = [];   // {timeline, progress: () => 0..1}
  const clamp01 = v => Math.min(1, Math.max(0, v));

  const sceneProgress = el => {           // tall pinned scene
    const r = el.getBoundingClientRect();
    return clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
  };
  const enterProgress = el => {           // element travelling through viewport
    const r = el.getBoundingClientRect();
    return clamp01((window.innerHeight * .92 - r.top) / (window.innerHeight * .55));
  };

  function registerItems(nodeList) {
    if (!anime || reduceMotion) return;
    nodeList.forEach(el => {
      if (el.dataset.scrub) return;
      el.dataset.scrub = '1';
      const tl = anime.timeline({autoplay: false})
        .add({targets: el, opacity: [0, 1], translateY: [36, 0], duration: 500, easing: 'easeOutQuad'});
      drivers.push({timeline: tl, progress: () => enterProgress(el)});
    });
  }

  let ticking = false;
  function update() {
    ticking = false;
    drivers.forEach(d => d.timeline.seek(d.timeline.duration * d.progress()));
    const bar = document.querySelector('#scroll-progress-bar');
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp01(window.scrollY / max) : 0) + ')';
    }
    const pill = document.querySelector('.nav-pill');
    if (pill) pill.style.boxShadow = window.scrollY > 40
      ? '0 20px 40px -14px rgba(34, 80, 120, .55)'
      : '0 14px 34px -14px rgba(34, 80, 120, .45)';
  }
  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  if (anime && !reduceMotion) {
    const hero = document.querySelector('.hero');
    const runtimeScene = document.querySelector('#runtime');
    const featureScene = document.querySelector('#features');
    const desktop = window.matchMedia('(min-width: 861px)').matches;

    /* --- hero: scroll sends the cube across the paper valley --- */
    if (hero) {
      const vw = () => Math.min(window.innerWidth * .78, 1100);
      const heroTl = anime.timeline({autoplay: false})
        .add({targets: '.cloud-a', translateX: [0, 90], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.cloud-b', translateX: [0, -70], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.cloud-c', translateX: [0, 50], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.hill-back', translateY: [0, 26], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.hill-front', translateY: [0, 44], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.hero-title', translateY: [0, -70], opacity: [1, .1], duration: 700, easing: 'easeInQuad'}, 0)
        .add({targets: '.hero-lede, .hero-actions, .hero-note', translateY: [0, -46], opacity: [1, 0], duration: 600, easing: 'easeInQuad'}, 0)
        .add({targets: '.hero-window', translateY: [0, -34], scale: [1, .965], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.sticker-hosts', translateX: [0, -34], translateY: [0, -18], rotate: [-3, -7], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.sticker-formats', translateX: [0, 30], translateY: [0, 16], rotate: [2.2, 6], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.journey-cube', translateX: [0, vw()], rotate: [0, 300], duration: 1000, easing: 'easeInOutQuad'}, 0)
        .add({targets: '.journey-cube', keyframes: [
          {translateY: 0}, {translateY: -54}, {translateY: 0}, {translateY: -38}, {translateY: 0}
        ], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.scroll-hint span', translateY: [0, 8], duration: 1000, easing: 'linear'}, 0);
      drivers.push({
        timeline: heroTl,
        progress: () => {
          const r = hero.getBoundingClientRect();
          return clamp01(-r.top / Math.max(1, r.height * .75));
        }
      });
    }

    /* --- runtime: pinned scene, steps light up as you scroll --- */
    if (runtimeScene && desktop) {
      const stepsTl = anime.timeline({autoplay: false})
        .add({targets: '#steps-fill', scaleY: [0, 1], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.scrub-step', opacity: [.22, 1], translateX: [-26, 0], scale: [.97, 1],
              duration: 300, easing: 'easeOutQuad', delay: anime.stagger(280)}, 60)
        .add({targets: '#runtime .runtime-copy', translateY: [44, 0], opacity: [0, 1], duration: 380, easing: 'easeOutQuad'}, 0)
        .add({targets: '#runtime .paper-panel', translateY: [60, 0], opacity: [0, 1], rotate: [1.6, .4], duration: 420, easing: 'easeOutQuad'}, 40);
      drivers.push({timeline: stepsTl, progress: () => sceneProgress(runtimeScene)});
    } else {
      registerItems(document.querySelectorAll('#runtime .scrub-step'));
    }

    /* --- features: pinned scene, cards ride a horizontal rail --- */
    const track = document.querySelector('#card-track');
    if (featureScene && track && desktop) {
      const travel = () => Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      const railTl = anime.timeline({autoplay: false})
        .add({targets: '#features .section-head', translateY: [36, 0], opacity: [0, 1], duration: 200, easing: 'easeOutQuad'}, 0)
        .add({targets: track, translateX: [0, () => -travel()], duration: 1000, easing: 'easeInOutQuad'}, 120)
        .add({targets: '#card-track .note-card', keyframes: [{translateY: 0}, {translateY: -12}, {translateY: 0}],
              duration: 900, easing: 'linear', delay: anime.stagger(120)}, 120);
      drivers.push({timeline: railTl, progress: () => sceneProgress(featureScene)});
    }

    /* --- terminal: lines "type in" with scroll --- */
    const term = document.querySelector('.terminal-card');
    if (term) {
      const lines = term.querySelectorAll('.term-line');
      const termTl = anime.timeline({autoplay: false})
        .add({targets: lines, opacity: [0, 1], translateX: [-16, 0], duration: 120,
              easing: 'easeOutQuad', delay: anime.stagger(110)});
      drivers.push({timeline: termTl, progress: () => enterProgress(term)});
    }

    /* --- everything else: scrub-in while entering --- */
    registerItems(document.querySelectorAll(
      '.reveal:not(#runtime .reveal):not(#features .reveal), .desktop-shot img, .guide-card'));
  }

  window.addEventListener('scroll', requestUpdate, {passive: true});
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate);
  requestUpdate();
})();

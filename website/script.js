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

  /* ================= scroll film (Anime.js, offset-driven) =================
     Every animation is scrubbed by scroll position. Progress is computed
     from layout offsets (offsetTop), which CSS transforms cannot change,
     so an animated element can never feed back into its own progress.
     No pinning, no autoplay, no loops. */
  const anime = window.anime;
  const drivers = [];
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const docTop = el => {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  };
  const enter = (el, span = .55) =>
    clamp01((window.scrollY + window.innerHeight * .92 - docTop(el)) / (window.innerHeight * span));
  const globalP = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? clamp01(window.scrollY / max) : 0;
  };

  function addDriver(timeline, progressFn) {
    drivers.push({timeline, progressFn});
    timeline.seek(0);
  }

  function registerItems(nodeList) {
    if (!anime) return;
    nodeList.forEach(el => {
      if (el.dataset.scrub) return;
      el.dataset.scrub = '1';
      const tl = anime.timeline({autoplay: false})
        .add({targets: el, opacity: [0, 1], translateY: [36, 0], duration: 500, easing: 'easeOutQuad'});
      addDriver(tl, () => enter(el));
    });
  }

  let ticking = false;
  function update() {
    ticking = false;
    drivers.forEach(d => d.timeline.seek(d.timeline.duration * d.progressFn()));

    const p = globalP();
    const bar = document.querySelector('#scroll-progress-bar');
    if (bar) bar.style.transform = 'scaleX(' + p + ')';

    /* companion cube rides its paper trail down the whole page */
    const cube = document.querySelector('#companion-cube');
    const trail = document.querySelector('.companion-trail');
    const fill = document.querySelector('#companion-fill');
    if (cube && trail && anime) {
      if (fill) fill.style.transform = 'scaleY(' + p + ')';
      anime.set(cube, {translateY: -(1 - p) * (trail.clientHeight + 10), rotate: p * 540});
    }
    const label = document.querySelector('#companion-label');
    if (label) {
      let chapter = 'SKY';
      document.querySelectorAll('[data-chapter]').forEach(sec => {
        if (docTop(sec) <= window.scrollY + window.innerHeight * .45) chapter = sec.dataset.chapter;
      });
      if (label.textContent !== chapter) label.textContent = chapter;
    }

    /* marquee band slides with scroll */
    const track = document.querySelector('#marquee-track');
    if (track) track.style.transform = 'translateX(' + (-p * 420) + 'px)';

    const pill = document.querySelector('.nav-pill');
    if (pill) pill.style.boxShadow = window.scrollY > 40
      ? '0 20px 40px -14px rgba(34, 80, 120, .55)'
      : '0 14px 34px -14px rgba(34, 80, 120, .45)';
  }
  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  if (anime) {
    /* hero: layers drift apart, cube rolls across the valley (hop on the img) */
    const heroTl = anime.timeline({autoplay: false})
      .add({targets: '.cloud-a', translateX: [0, 90], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.cloud-b', translateX: [0, -70], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.cloud-c', translateX: [0, 50], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hill-back', translateY: [0, 26], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hill-front', translateY: [0, 44], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hero-title', translateY: [0, -64], opacity: [1, .15], duration: 700, easing: 'linear'}, 0)
      .add({targets: '.hero-lede, .hero-actions, .hero-note, .scroll-hint', translateY: [0, -40], opacity: [1, 0], duration: 600, easing: 'linear'}, 0)
      .add({targets: '.hero .paper-scene', translateY: [0, -30], scale: [1, .97], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.scene-cloud-1', translateX: [0, 46], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.scene-cloud-2', translateX: [0, -58], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.scene-hill-1', translateY: [0, 10], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.scene-hill-2', translateY: [0, 20], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.scene-hill-3', translateY: [0, 32], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hero .scene-cube', keyframes: [{translateY: 0}, {translateY: -26}, {translateY: 0}], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hero .scene-letters text', translateY: [26, 0], opacity: [0, 1], duration: 300, easing: 'easeOutBack', delay: anime.stagger(70)}, 120)
      .add({targets: '.sticker-hosts', translateX: [0, -30], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.sticker-formats', translateX: [0, 26], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.journey-cube', translateX: [0, () => Math.min(window.innerWidth * .76, 1080)], rotate: [0, 300], duration: 1000, easing: 'easeInOutQuad'}, 0)
      .add({targets: '.journey-cube img', keyframes: [{translateY: 0}, {translateY: -52}, {translateY: 0}, {translateY: -36}, {translateY: 0}], duration: 1000, easing: 'linear'}, 0);
    addDriver(heroTl, () => clamp01(window.scrollY / (window.innerHeight * .9)));

    /* runtime: steps activate in sequence, line fills */
    const stepsWrap = document.querySelector('.steps-wrap');
    if (stepsWrap) {
      const stepsTl = anime.timeline({autoplay: false})
        .add({targets: '#steps-fill', scaleY: [0, 1], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.scrub-step', opacity: [.18, 1], translateX: [-24, 0], duration: 260, easing: 'easeOutQuad', delay: anime.stagger(240)}, 80)
        .add({targets: '#runtime .runtime-copy, #runtime .paper-panel', opacity: [0, 1], translateY: [40, 0], duration: 350, easing: 'easeOutQuad', delay: anime.stagger(120)}, 0);
      addDriver(stepsTl, () => enter(stepsWrap, .8));
    }

    /* features: note cards cascade in */
    const cardGrid = document.querySelector('#card-track');
    if (cardGrid) {
      const cardsTl = anime.timeline({autoplay: false})
        .add({targets: '#card-track .note-card', opacity: [0, 1], translateY: [70, 0], duration: 300, easing: 'easeOutQuad', delay: anime.stagger(160)});
      addDriver(cardsTl, () => enter(cardGrid, .7));
    }

    /* terminal: lines arrive in sequence */
    const term = document.querySelector('.terminal-card');
    if (term) {
      const termTl = anime.timeline({autoplay: false})
        .add({targets: '.term-line', opacity: [0, 1], translateX: [-16, 0], duration: 110, easing: 'easeOutQuad', delay: anime.stagger(100)});
      addDriver(termTl, () => enter(term, .7));
    }

    /* giant wordmark letters bounce in one by one */
    const letters = document.querySelector('#letters');
    if (letters) {
      const lettersTl = anime.timeline({autoplay: false})
        .add({targets: '#letters span', opacity: [0, 1], translateY: [110, 0],
              rotate: [(el, i) => (i % 2 ? 7 : -7), 0],
              duration: 260, easing: 'easeOutBack', delay: anime.stagger(90)})
        .add({targets: '.letters-caption', opacity: [0, 1], translateY: [16, 0], duration: 240, easing: 'easeOutQuad'}, '-=80');
      addDriver(lettersTl, () => enter(letters, .65));
    }

    /* remaining cards/sections scrub in individually */
    registerItems(document.querySelectorAll(
      '.reveal:not(#runtime .reveal):not(#features .reveal), .guide-card, .lineage-art, .join-card'));
  }

  window.addEventListener('scroll', requestUpdate, {passive: true});
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate);
  requestUpdate();
})();

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
    measure(); kick();
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

  /* ================= scroll film engine v3 (damped scrub) =================
     Research-backed recipe for butter-smooth scroll animation:
       - Native scroll stays native; the *animation values* are damped.
         Each driver's progress chases its scroll target with lerp
         (cur += (target - cur) * 0.085), the "cinematic" range used by
         smooth-scroll libraries, so motion glides instead of snapping.
       - One requestAnimationFrame loop, started on scroll/resize and
         stopped once every driver has settled (no idle CPU burn).
       - Only transform/opacity are animated (compositor-friendly), and
         progress comes from layout offsets cached on resize/load --
         transforms never feed back into progress.
       - Where the browser supports native CSS scroll-timelines, the
         top progress bar runs on the compositor and JS leaves it alone. */
  const anime = window.anime;
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const cssScrollTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');

  const drivers = [];        // {timeline, el|null, span, top, cur, target, hero}
  let docHeight = 1;

  const docTop = el => {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  };
  function measure() {
    docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    drivers.forEach(d => { if (d.el) d.top = docTop(d.el); });
  }
  function retarget() {
    const y = window.scrollY;
    drivers.forEach(d => {
      d.target = d.hero
        ? clamp01(y / (window.innerHeight * .9))
        : clamp01((y + window.innerHeight * .92 - d.top) / (window.innerHeight * d.span));
    });
  }

  function addDriver(timeline, opts) {
    const d = Object.assign({timeline, el: null, span: .55, top: 0, cur: 0, target: 0, hero: false}, opts);
    drivers.push(d);
    timeline.seek(0);
    return d;
  }
  function registerItems(nodeList) {
    if (!anime) return;
    nodeList.forEach(el => {
      if (el.dataset.scrub) return;
      el.dataset.scrub = '1';
      const tl = anime.timeline({autoplay: false})
        .add({targets: el, opacity: [0, 1], translateY: [36, 0], duration: 500, easing: 'easeOutQuad'});
      addDriver(tl, {el});
    });
  }

  /* --- smoothed global state (progress bar, companion, marquee) --- */
  let gCur = 0, lastY = window.scrollY, velocity = 0;
  const bar = document.querySelector('#scroll-progress-bar');
  const pill = document.querySelector('.nav-pill');
  const cubeEl = document.querySelector('#companion-cube');
  const trailEl = document.querySelector('.companion-trail');
  const fillEl = document.querySelector('#companion-fill');
  const labelEl = document.querySelector('#companion-label');
  const marqueeEl = document.querySelector('#marquee-track');
  const toTop = document.querySelector('#to-top');
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  let chapterTops = [];
  function measureChapters() { chapterTops = chapters.map(sec => ({top: docTop(sec), name: sec.dataset.chapter, id: sec.id})); }

  toTop?.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));

  let running = false;
  function frame() {
    retarget();
    let settled = Math.abs((window.scrollY / docHeight) - gCur) < .0004;
    const gTarget = clamp01(window.scrollY / docHeight);
    velocity = velocity * .88 + (window.scrollY - lastY) * .12;
    lastY = window.scrollY;
    gCur += (gTarget - gCur) * .085;
    if (Math.abs(gTarget - gCur) < .0004) gCur = gTarget;

    drivers.forEach(d => {
      const diff = d.target - d.cur;
      if (Math.abs(diff) > .0004) { settled = false; d.cur += diff * .085; }
      else d.cur = d.target;
      d.timeline.seek(d.timeline.duration * d.cur);
    });

    if (!cssScrollTimeline && bar) bar.style.transform = 'scaleX(' + gCur + ')';
    if (fillEl) fillEl.style.transform = 'scaleY(' + gCur + ')';
    if (cubeEl && trailEl && anime) {
      anime.set(cubeEl, {translateY: -(1 - gCur) * (trailEl.clientHeight + 10), rotate: gCur * 540});
    }
    if (marqueeEl) {
      const skew = Math.max(-6, Math.min(6, velocity * .04));
      marqueeEl.style.transform = 'translateX(' + (-gCur * 420) + 'px) skewX(' + skew + 'deg)';
    }
    if (pill) pill.style.boxShadow = window.scrollY > 40
      ? '0 20px 40px -14px rgba(34, 80, 120, .55)'
      : '0 14px 34px -14px rgba(34, 80, 120, .45)';
    if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 600);

    if (labelEl || navLinks.length) {
      let chapter = 'SKY', activeId = '';
      chapterTops.forEach(c => {
        if (c.top <= window.scrollY + window.innerHeight * .45) { chapter = c.name; activeId = c.id; }
      });
      if (labelEl && labelEl.textContent !== chapter) labelEl.textContent = chapter;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + activeId));
    }

    if (!settled) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  if (anime) {
    const heroTl = anime.timeline({autoplay: false})
      .add({targets: '.cloud-a', translateX: [0, 90], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.cloud-b', translateX: [0, -70], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.cloud-c', translateX: [0, 50], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hill-back', translateY: [0, 26], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hill-front', translateY: [0, 44], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hero-title', translateY: [0, -64], opacity: [1, .15], duration: 700, easing: 'linear'}, 0)
      .add({targets: '.hero-lede, .hero-actions, .hero-note, .scroll-hint', translateY: [0, -40], opacity: [1, 0], duration: 600, easing: 'linear'}, 0)
      .add({targets: '.hero-bg', translateY: [0, 34], scale: [1.04, 1], duration: 1000, easing: 'linear'}, 0)
      .add({targets: '.hero-bg svg', translateY: [0, -18], duration: 1000, easing: 'linear'}, 0)
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
    addDriver(heroTl, {hero: true});

    const stepsWrap = document.querySelector('.steps-wrap');
    if (stepsWrap) {
      const stepsTl = anime.timeline({autoplay: false})
        .add({targets: '#steps-fill', scaleY: [0, 1], duration: 1000, easing: 'linear'}, 0)
        .add({targets: '.scrub-step', opacity: [.18, 1], translateX: [-24, 0], duration: 260, easing: 'easeOutQuad', delay: anime.stagger(240)}, 80)
        .add({targets: '#runtime .runtime-copy, #runtime .paper-panel', opacity: [0, 1], translateY: [40, 0], duration: 350, easing: 'easeOutQuad', delay: anime.stagger(120)}, 0);
      addDriver(stepsTl, {el: stepsWrap, span: .8});
    }

    const cardGrid = document.querySelector('#card-track');
    if (cardGrid) {
      const cardsTl = anime.timeline({autoplay: false})
        .add({targets: '#card-track .note-card', opacity: [0, 1], translateY: [70, 0], duration: 300, easing: 'easeOutQuad', delay: anime.stagger(160)});
      addDriver(cardsTl, {el: cardGrid, span: .7});
    }

    const term = document.querySelector('.terminal-card');
    if (term) {
      const termTl = anime.timeline({autoplay: false})
        .add({targets: '.term-line', opacity: [0, 1], translateX: [-16, 0], duration: 110, easing: 'easeOutQuad', delay: anime.stagger(100)});
      addDriver(termTl, {el: term, span: .7});
    }

    const letters = document.querySelector('#letters');
    if (letters) {
      const lettersTl = anime.timeline({autoplay: false})
        .add({targets: '#letters span', opacity: [0, 1], translateY: [110, 0],
              rotate: [(el, i) => (i % 2 ? 7 : -7), 0],
              duration: 260, easing: 'easeOutBack', delay: anime.stagger(90)})
        .add({targets: '.letters-caption', opacity: [0, 1], translateY: [16, 0], duration: 240, easing: 'easeOutQuad'}, '-=80');
      addDriver(lettersTl, {el: letters, span: .65});
    }

    registerItems(document.querySelectorAll(
      '.reveal:not(#runtime .reveal):not(#features .reveal), .guide-card, .lineage-art, .join-card'));
  }

  measure(); measureChapters(); retarget();
  drivers.forEach(d => { d.cur = d.target; });   // start exactly at rest state for current scroll
  gCur = clamp01(window.scrollY / docHeight);
  kick();

  let resizeTimer;
  window.addEventListener('scroll', kick, {passive: true});
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { measure(); measureChapters(); kick(); }, 160);
  });
  window.addEventListener('load', () => { measure(); measureChapters(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
})();

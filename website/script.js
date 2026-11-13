(() => {
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
    if (event.key === 'Escape') {
      closeNav();
      toggle?.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav?.classList.contains('is-open')) return;
    if (event.target instanceof Node && !nav.contains(event.target) && !toggle?.contains(event.target)) closeNav();
  });

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
    } catch {
      return null;
    }
  };

  const setStatus = (label, state) => {
    if (!releaseStatus) return;
    releaseStatus.classList.remove('is-ready', 'is-error');
    if (state) releaseStatus.classList.add(state);
    releaseStatus.replaceChildren();
    const dot = document.createElement('i');
    const text = document.createElement('span');
    text.textContent = label;
    releaseStatus.append(dot, text);
  };

  const renderRelease = release => {
    const card = document.createElement('article');
    card.className = 'release-card';

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

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.feature-card, .guide-card, .runtime-panel, .lineage-copy');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {threshold: 0.12});

    targets.forEach(target => {
      target.classList.add('will-reveal');
      observer.observe(target);
    });
  }
})();
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-nav');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false');
  }));

  const list = document.querySelector('#release-list');
  const repo = 'https://github.com/flessan/stubuika';
  const assetLabel = name => {
    const n = name.toLowerCase();
    if (n.endsWith('.dmg') || n.includes('macos') || n.includes('darwin')) return 'macOS';
    if (n.endsWith('.zip') || n.includes('windows') || n.includes('win-')) return 'Windows';
    if (n.endsWith('.tar.gz') || n.includes('linux')) return 'Linux';
    return 'Download';
  };
  const dateLabel = date => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.valueOf()) ? '' : parsed.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
  };
  const render = releases => {
    if (!list) return;
    list.replaceChildren();
    const published = releases.filter(r => !r.draft && !r.prerelease);
    if (!published.length) {
      const empty = document.createElement('p'); empty.className = 'release-empty';
      empty.textContent = 'No published release assets are available yet. Visit GitHub for source builds and project updates.';
      list.append(empty); return;
    }
    published.slice(0, 4).forEach(release => {
      const card = document.createElement('article'); card.className = 'release-card';
      const meta = document.createElement('div'); meta.className = 'release-meta';
      const title = document.createElement('h3'); title.textContent = release.name || release.tag_name;
      const date = document.createElement('p'); date.textContent = `${release.tag_name}${release.published_at ? ` · ${dateLabel(release.published_at)}` : ''}`;
      meta.append(title, date);
      const assets = document.createElement('div'); assets.className = 'asset-links';
      (release.assets || []).forEach(asset => {
        const a = document.createElement('a'); a.className = 'asset-link';
        a.href = asset.browser_download_url; a.textContent = `${assetLabel(asset.name)} · ${asset.name}`;
        a.setAttribute('aria-label', `Download ${asset.name} from ${release.tag_name}`);
        assets.append(a);
      });
      if (!assets.childElementCount) {
        const notes = document.createElement('a'); notes.className = 'asset-link'; notes.href = release.html_url; notes.textContent = 'Release notes'; assets.append(notes);
      }
      card.append(meta, assets); list.append(card);
    });
  };
  fetch('https://api.github.com/repos/flessan/stubuika/releases?per_page=8', {headers:{Accept:'application/vnd.github+json'}})
    .then(response => { if (!response.ok) throw new Error(`GitHub returned ${response.status}`); return response.json(); })
    .then(render)
    .catch(() => {
      if (!list) return;
      list.replaceChildren(); const message = document.createElement('p'); message.className = 'release-empty';
      message.append('Release information could not be loaded right now. ');
      const link = document.createElement('a'); link.href = `${repo}/releases`; link.textContent = 'See all releases on GitHub'; link.className = 'text-link'; message.append(link); list.append(message);
    });

  const revealTargets = document.querySelectorAll('.feature-card, .guide-card, .about-stamp');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {threshold: 0.13});
    revealTargets.forEach(el => { el.classList.add('reveal'); observer.observe(el); });
  }
})();

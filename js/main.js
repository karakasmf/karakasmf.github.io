// === AOS ===
AOS.init({ duration: 800, once: true, offset: 100 });

// === Tek scroll handler + rAF + passive ===
(() => {
  const navbar = document.getElementById('navbar');
  const header = document.querySelector('header');
  const headerContent = document.querySelector('.header-content');
  const profileImage = document.querySelector('.profile-image-container');
  const researchSection = document.querySelector('#research');

  const sections = Array.from(document.querySelectorAll('section'));
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const NAV_OFFSET = 100;

  let ticking = false;

  function onScrollFrame() {
    const y = window.scrollY || 0;

    // Navbar scrolled
    if (navbar) navbar.classList.toggle('scrolled', y > 50);

    // Parallax
    if (header) header.style.transform = `translate3d(0, ${y * 0.5}px, 0)`;

    // Aktif link
    let current = '';
    for (const s of sections) {
      const top = s.offsetTop - (NAV_OFFSET + 100);
      if (y >= top) current = s.id || '';
    }
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href').slice(1) === current);
    });

    // Header fade
    if (researchSection && headerContent && profileImage) {
      const t = researchSection.getBoundingClientRect().top;
      const h = window.innerHeight || 1;
      const opacity = Math.max(0, Math.min(1, t / h));
      const dy = (1 - opacity) * -50;
      headerContent.style.opacity = opacity;
      profileImage.style.opacity = opacity;
      headerContent.style.transform = `translate3d(0, ${dy}px, 0)`;
      profileImage.style.transform = `translate3d(0, ${dy}px, 0)`;
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(onScrollFrame);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();

// === Scholar stats (0 citations gizle + no-store) ===
async function updateScholarStats() {
  try {
    const res = await fetch('./assets/data/scholar_stats.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();

    // Citations 0 ise satırı gizle
    const citationContainer =
      document.getElementById('citation-count-container') ||
      (document.getElementById('citation-count')?.parentElement ?? null);

    if (citationContainer) {
      const c = Number(d.citations);
      if (!Number.isFinite(c) || c <= 0) {
        citationContainer.style.display = 'none';
      } else {
        const el = document.getElementById('citation-count');
        if (el) el.textContent = String(c);
        citationContainer.style.display = '';
      }
    }

    const publication = document.getElementById('publication-count');
    const hIndex = document.getElementById('h-index');
    const lastUpdated = document.getElementById('last-updated');

    if (publication) publication.textContent = d.publications ?? '—';
    if (hIndex) hIndex.textContent = d.h_index ?? '—';
    if (lastUpdated) lastUpdated.textContent = d.last_updated ?? '—';
  } catch (e) {
    console.error('Error fetching scholar stats:', e);
  }
}

// === Güvenli element yardımcıları (XSS azaltma) ===
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function publicationItem(prefix, idx, pub) {
  const item = el('div', 'publication-item');
  item.setAttribute('data-aos', 'fade-up');

  const cite = Number(pub.citations_count ?? 0);
  const meta = el('div', 'publication-year',
    `Year: ${pub.year}${cite > 0 ? ` — Citations: ${cite}` : ''}`);

  const h3 = el('h3');
  const a = document.createElement('a');
  a.target = '_blank';
  a.rel = 'noopener';
  a.href = pub.url || '#';
  a.textContent = pub.title || 'Untitled';
  h3.appendChild(a);

  const j = el('p', 'Journal', pub.citation || 'Citation not available');

  const btn = el('button', 'abstract-toggle', 'Show Abstract');
  const abs = el('div', 'abstract', pub.abstract || 'Abstract not available');
  abs.id = `abstract-${prefix}-${idx}`;
  abs.style.display = 'none';
  btn.addEventListener('click', () => {
    const hidden = abs.style.display === 'none';
    abs.style.display = hidden ? 'block' : 'none';
    btn.textContent = hidden ? 'Hide Abstract' : 'Show Abstract';
  });

  item.append(meta, h3, j, btn, abs);
  return item;
}

// === Recent (prefix: r) ===
async function updatePublications() {
  try {
    const wrap = document.getElementById('recent-publications');
    if (!wrap) return;

    const res = await fetch('./assets/data/scholar_stats.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    wrap.innerHTML = '';
    (data.recent_publications || []).slice(0, 3).forEach((pub, i) => {
      wrap.appendChild(publicationItem('r', i, pub));
    });

    if (window.AOS?.refresh) AOS.refresh();
  } catch (e) {
    console.error('Error updating publications:', e);
  }
}

// === All (prefix: a) ===
async function updatePublications_all() {
  try {
    const wrap = document.getElementById('all-publications');
    if (!wrap) return;

    const res = await fetch('./assets/data/scholar_stats.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    wrap.innerHTML = '';
    (data.recent_publications || []).forEach((pub, i) => {
      wrap.appendChild(publicationItem('a', i, pub));
    });

    if (window.AOS?.refresh) AOS.refresh();
  } catch (e) {
    console.error('Error updating publications:', e);
  }
}

// === DOMContentLoaded ===
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  const navLinksItems = document.querySelectorAll('.nav-links a');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    navLinksItems.forEach(item => {
      item.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      }
    });
  }

  // Smooth scroll (dahili anchor)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerOffset = 100;
        const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // Scholar init
  updateScholarStats();
  if (document.getElementById('recent-publications')) updatePublications();
  if (document.getElementById('all-publications')) updatePublications_all();
});

// === Load state ===
window.addEventListener('load', () => document.body.classList.add('loaded'), { once: true });

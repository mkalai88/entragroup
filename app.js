  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.02 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
  setTimeout(() => { document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible')); }, 1500);

  // ─── GOOGLE SHEETS OPDRACHTEN ───────────────
  const SHEET_ID = '1vmeIKeQZfRr5N0Vw59GvjDVJ_8pZwgZ1IKTENKsZUFQ';
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  let allOpdrachten = [];

  function getWerkvormClass(werkvorm) {
    const w = (werkvorm || '').toLowerCase();
    if (w.includes('freelance')) return 'type-freelance';
    if (w.includes('payroll')) return 'type-opdracht';
    if (w.includes('detachering')) return 'type-ws';
    return 'type-det';
  }

  function getWerkvormData(werkvorm) {
    const w = (werkvorm || '').toLowerCase();
    if (w.includes('freelance')) return 'freelance';
    if (w.includes('payroll') || w.includes('detachering')) return 'detachering-payroll';
    return 'detachering-payroll';
  }

  function getLocatieData(locatie) {
    const l = (locatie || '').toLowerCase();
    if (l.includes('amsterdam') || l.includes('noord-holland')) return 'noord-holland';
    if (l.includes('rotterdam') || l.includes('den haag') || l.includes('zuid-holland')) return 'zuid-holland';
    if (l.includes('utrecht')) return 'utrecht';
    if (l.includes('eindhoven') || l.includes('brabant')) return 'noord-brabant';
    if (l.includes('remote')) return 'remote';
    return '';
  }

  function formatDeadline(deadline) {
    if (!deadline) return null;
    const date = new Date(deadline);
    if (isNaN(date)) return null;
    const now = new Date();
    const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((date - now) / (1000 * 60 * 60));
    const diffMins = Math.floor((date - now) / (1000 * 60));
    const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

    if (diffMins < 0) return { text: `Gesloten op ${dateStr} om ${timeStr}`, urgent: true, expired: true };
    if (diffMins < 60) return { text: `Sluit over ${diffMins} minuten om ${timeStr}`, urgent: true, expired: false };
    if (diffHours < 24) return { text: `Sluit vandaag om ${timeStr}`, urgent: true, expired: false };
    if (diff <= 7) return { text: `Sluit over ${diff} dag${diff === 1 ? '' : 'en'} om ${timeStr}`, urgent: true, expired: false };
    return { text: `Sluit op ${dateStr} om ${timeStr}`, urgent: false, expired: false };
  }

  function renderOpdrachten(data) {
    const grid = document.getElementById('opdrachtenGrid');
    if (!data.length) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--mid);">Geen opdrachten gevonden</div>';
      return;
    }

    grid.innerHTML = data.map((o, index) => {
      const deadline = formatDeadline(o.deadline);
      const skills = (o.skills || '').split(',').map(s => s.trim()).filter(Boolean);
      const deadlineHTML = deadline ? `
        <div style="
          background: ${deadline.expired ? '#2a2a2a' : deadline.urgent ? '#ff4444' : '#1a1a1a'};
          color: white;
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 0.5rem 0.8rem;
          margin-bottom: 1rem;
          display: inline-block;
        ">
          ⏱ ${deadline.text}
        </div>` : '';

      return `
        <div class="opdracht-card fade-up"
          data-werkvorm="${getWerkvormData(o.werkvorm)}"
          data-locatie="${getLocatieData(o.locatie)}"
          data-title="${o.titel}"
          data-index="${index}">
          <span class="opdracht-type ${getWerkvormClass(o.werkvorm)}">${o.werkvorm}</span>
          ${deadlineHTML}
          <div class="opdracht-title">${o.titel}</div>
          <div class="opdracht-company">${o.bedrijf} — ${o.locatie}</div>
          <div class="opdracht-tags">
            ${skills.map(s => `<span class="tag">${s}</span>`).join('')}
          </div>
          <div class="opdracht-footer">
            <div class="opdracht-meta"><strong>${o.tarief}</strong> · ${o.looptijd}</div>
            <div style="display:flex; gap:0.8rem; align-items:center;">
              <a href="#" class="opdracht-apply" onclick="openDetail(${index}); return false;">Bekijk opdracht</a>
              ${!deadline?.expired ? `<a href="#" class="opdracht-apply" style="color:var(--dark);" onclick="openReageer('${o.titel.replace(/'/g, "\\'")}'); return false;">Reageer \u2192</a>` : `<span style="font-size:0.75rem; color:#ff4444; font-weight:700;">VERLOPEN</span>`}
            </div>
          </div>
        </div>`;
    }).join('');

    // Reapply filters after render
    applyFilters();
  }

  function loadOpdrachten() {
    fetch(SHEET_URL)
      .then(r => r.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;
        allOpdrachten = rows
          .map(row => ({
            titel:        row.c[0]?.v || '',
            bedrijf:      row.c[1]?.v || '',
            locatie:      row.c[2]?.v || '',
            werkvorm:     row.c[3]?.v || '',
            tarief:       row.c[4]?.v || '',
            looptijd:     row.c[5]?.v || '',
            skills:       row.c[6]?.v || '',
            deadline:     row.c[7]?.v || '',
            status:       row.c[8]?.v || 'actief',
            omschrijving: row.c[9]?.v || '',
          }))
          .filter(o => o.titel && o.status.toLowerCase() !== 'inactief');
        renderOpdrachten(allOpdrachten);
      })
      .catch(() => {
        document.getElementById('opdrachtenGrid').innerHTML =
          '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--mid);">Opdrachten kunnen niet worden geladen. Probeer het later opnieuw.</div>';
      });
  }

  loadOpdrachten();

  // ─── DETAIL MODAL ───────────────────────────
  let currentDetailTitel = '';

  function openDetail(index) {
    const o = allOpdrachten[index];
    currentDetailTitel = o.titel;
    const deadline = formatDeadline(o.deadline);
    const skills = (o.skills || '').split(',').map(s => s.trim()).filter(Boolean);

    document.getElementById('detailTitel').textContent = o.titel;
    document.getElementById('detailBedrijf').textContent = `${o.bedrijf} — ${o.locatie}`;
    document.getElementById('detailTarief').textContent = o.tarief;
    document.getElementById('detailLooptijd').textContent = o.looptijd;
    document.getElementById('detailOmschrijving').textContent = o.omschrijving || 'Neem contact op voor meer informatie over deze opdracht.';

    const werkvormEl = document.getElementById('detailWerkvorm');
    werkvormEl.textContent = o.werkvorm;
    werkvormEl.className = `opdracht-type ${getWerkvormClass(o.werkvorm)}`;

    const deadlineEl = document.getElementById('detailDeadline');
    if (deadline) {
      deadlineEl.textContent = `⏱ ${deadline.text}`;
      deadlineEl.style.background = deadline.expired ? '#2a2a2a' : deadline.urgent ? '#ff4444' : '#1a1a1a';
      deadlineEl.style.color = 'white';
      deadlineEl.style.padding = '0.5rem 0.8rem';
      deadlineEl.style.display = 'inline-block';
      deadlineEl.style.fontSize = '0.72rem';
      deadlineEl.style.fontWeight = '700';
      deadlineEl.style.letterSpacing = '0.08em';
      deadlineEl.style.textTransform = 'uppercase';
    } else {
      deadlineEl.textContent = '';
    }

    document.getElementById('detailSkills').innerHTML = skills.map(s => `<span class="tag">${s}</span>`).join('');

    const btn = document.getElementById('detailReageerBtn');
    if (deadline?.expired) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'block';
    }

    document.getElementById('detailModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    document.getElementById('detailModal').style.display = 'none';
    document.body.style.overflow = '';
  }

  function openReageerFromDetail() {
    closeDetail();
    openReageer(currentDetailTitel);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDetail(); closeReageer(); }
  });

  // ─── REAGEER MODAL ──────────────────────────
  function openReageer(titel) {
    document.getElementById('modalTitel').textContent = titel;
    document.getElementById('modalOpdracht').value = titel;
    document.getElementById('reageerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeReageer() {
    document.getElementById('reageerModal').style.display = 'none';
    document.body.style.overflow = '';
  }

  // ─── FILTER LOGIC ───────────────────────────
  const searchInput    = document.getElementById('searchInput');
  const filterWerkvorm = document.getElementById('filterWerkvorm');
  const filterLocatie  = document.getElementById('filterLocatie');
  const filterReset    = document.getElementById('filterReset');
  const filterResults  = document.getElementById('filterResults');

  function applyFilters() {
    const cards = document.querySelectorAll('.opdracht-card');
    const search   = searchInput.value.toLowerCase().trim();
    const werkvorm = filterWerkvorm.value;
    const locatie  = filterLocatie.value;
    let visible = 0;
    cards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const tags  = card.innerText.toLowerCase();
      const cWerk = card.dataset.werkvorm || '';
      const cLoc  = card.dataset.locatie  || '';
      const ok = (!search || title.includes(search) || tags.includes(search))
              && (!werkvorm || cWerk === werkvorm)
              && (!locatie  || cLoc  === locatie);
      card.style.display = ok ? 'flex' : 'none';
      if (ok) visible++;
    });
    filterResults.innerHTML = visible === cards.length ? '' : `<strong>${visible}</strong> van <strong>${cards.length}</strong> opdrachten gevonden`;
    filterWerkvorm.classList.toggle('active', !!werkvorm);
    filterLocatie.classList.toggle('active', !!locatie);
  }

  searchInput.addEventListener('input', applyFilters);
  filterWerkvorm.addEventListener('change', applyFilters);
  filterLocatie.addEventListener('change', applyFilters);
  filterReset.addEventListener('click', () => {
    searchInput.value = ''; filterWerkvorm.value = ''; filterLocatie.value = '';
    filterWerkvorm.classList.remove('active'); filterLocatie.classList.remove('active');
    document.querySelectorAll('.opdracht-card').forEach(c => c.style.display = 'flex');
    filterResults.innerHTML = '';
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  function submitReageer() {
    const form = document.getElementById('reageerForm');
    const inputs = form.querySelectorAll('[required]');
    let valid = true;
    inputs.forEach(i => {
      if (!i.value.trim()) { i.style.borderColor = '#ff4444'; valid = false; }
      else { i.style.borderColor = '#ddd'; }
    });
    if (!valid) return;
    const data = new FormData(form);
    fetch(form.action, {
      method: 'POST', body: data,
      headers: { 'Accept': 'application/json' }
    }).then(r => {
      if (r.ok) {
        closeReageer();
        form.reset();
        window.location.href = 'bedankt.html';
      } else {
        alert('Er is iets misgegaan. Probeer het opnieuw.');
      }
    }).catch(() => alert('Er is iets misgegaan. Probeer het opnieuw.'));
  }

  function validateForm() {
    const fields = [
      { id: 'voornaam',       err: 'err-voornaam' },
      { id: 'achternaam',     err: 'err-achternaam' },
      { id: 'bedrijfsnaam',   err: 'err-bedrijfsnaam' },
      { id: 'email',          err: 'err-email' },
      { id: 'telefoonnummer', err: 'err-telefoonnummer' },
      { id: 'werkvorm',       err: 'err-werkvorm' },
      { id: 'gezochte-rol',   err: 'err-rol' },
      { id: 'toelichting',    err: 'err-toelichting' },
    ];
    let valid = true;
    fields.forEach(f => {
      const input = document.querySelector(`[name="${f.id}"]`);
      const err   = document.getElementById(f.err);
      if (!input.value.trim()) {
        input.classList.add('error'); err.classList.add('visible'); valid = false;
      } else {
        input.classList.remove('error'); err.classList.remove('visible');
      }
    });
    if (valid) {
      const form = document.getElementById('mainForm');
      const data = new FormData(form);
      fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(response => {
        if (response.ok) {
          window.location.href = 'bedankt.html';
        } else {
          alert('Er is iets misgegaan. Probeer het opnieuw.');
        }
      }).catch(() => {
        alert('Er is iets misgegaan. Probeer het opnieuw.');
      });
    }
  }

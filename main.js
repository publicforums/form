/**
 * Relay — main.js
 * Handles: textarea auto-grow, validation (Q1–Q4),
 *          Formspree POST, redirect to success.html.
 */
(function () {
  'use strict';

  const form      = document.getElementById('relay-form');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  /* ── Config ───────────────────────────────────────────────── */
  const FORMSPREE = 'https://formspree.io/f/xaqagppb';
  const SUCCESS   = 'success.html';

  const TEXT_FIELDS = [
    { id: 'q1_problem', errId: 'err-q1', groupId: 'fg-q1' },
    { id: 'q2_features', errId: 'err-q2', groupId: 'fg-q2' },
    { id: 'q3_switch',   errId: 'err-q3', groupId: 'fg-q3' },
  ];

  const RATING_GROUP = { name: 'q4_interest', errId: 'err-q4', groupId: 'fg-q4' };

  let busy = false;

  /* ── Auto-grow textareas ──────────────────────────────────── */
  TEXT_FIELDS.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.max(108, this.scrollHeight) + 'px';
    });
  });

  /* ── Live error clearing ──────────────────────────────────── */
  TEXT_FIELDS.forEach(({ id, errId, groupId }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (el.value.trim()) clearErr(groupId, errId);
    });
  });

  // Clear rating error on any selection
  form.querySelectorAll(`input[name="${RATING_GROUP.name}"]`).forEach(radio => {
    radio.addEventListener('change', () => {
      clearErr(RATING_GROUP.groupId, RATING_GROUP.errId);
    });
  });

  /* ── Validation ───────────────────────────────────────────── */
  function validate() {
    let ok = true;
    let first = null;

    TEXT_FIELDS.forEach(({ id, errId, groupId }) => {
      const el = document.getElementById(id);
      clearErr(groupId, errId);
      if (!el || !el.value.trim()) {
        showErr(groupId, errId, 'This field is required.');
        ok = false;
        if (!first) first = el;
      }
    });

    // Rating
    const chosen = form.querySelector(`input[name="${RATING_GROUP.name}"]:checked`);
    clearErr(RATING_GROUP.groupId, RATING_GROUP.errId);
    if (!chosen) {
      showErr(RATING_GROUP.groupId, RATING_GROUP.errId, 'Please select a rating.');
      ok = false;
      if (!first) {
        first = form.querySelector(`input[name="${RATING_GROUP.name}"]`);
      }
    }

    if (first) {
      const top = first.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
      setTimeout(() => first.focus?.(), 250);
    }

    return ok;
  }

  /* ── Error helpers ────────────────────────────────────────── */
  function showErr(groupId, errId, msg) {
    const g = document.getElementById(groupId);
    const e = document.getElementById(errId);
    if (g) g.classList.add('has-err');
    if (e) { e.textContent = msg; e.classList.add('show'); }
  }

  function clearErr(groupId, errId) {
    const g = document.getElementById(groupId);
    const e = document.getElementById(errId);
    if (g) g.classList.remove('has-err');
    if (e) { e.textContent = ''; e.classList.remove('show'); }
  }

  /* ── Loading state ────────────────────────────────────────── */
  function setLoading(state) {
    busy = state;
    submitBtn.disabled = state;
    submitBtn.classList.toggle('is-loading', state);
    submitBtn.setAttribute('aria-busy', String(state));
  }

  /* ── Submit ───────────────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch(FORMSPREE, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        // Redirect to separate success screen
        window.location.href = SUCCESS;
      } else {
        const data = await res.json().catch(() => ({}));
        const msg  = data?.errors?.[0]?.message || 'Something went wrong — please try again.';
        showGlobalError(msg);
        setLoading(false);
      }
    } catch {
      showGlobalError('Network error — check your connection and try again.');
      setLoading(false);
    }
  });

  /* ── Inline global error (below button) ──────────────────── */
  function showGlobalError(msg) {
    document.querySelector('.global-err')?.remove();

    const p = document.createElement('p');
    p.className = 'global-err';
    p.textContent = msg;
    Object.assign(p.style, {
      fontSize:   '13px',
      color:      '#ff453a',
      textAlign:  'center',
      marginTop:  '4px',
      opacity:    '0',
      transition: 'opacity 180ms ease',
    });

    submitBtn.insertAdjacentElement('afterend', p);
    requestAnimationFrame(() => requestAnimationFrame(() => p.style.opacity = '1'));

    setTimeout(() => {
      p.style.opacity = '0';
      setTimeout(() => p.remove(), 220);
    }, 6000);
  }

})();

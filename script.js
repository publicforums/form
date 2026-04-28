/**
 * Relay — script.js
 * Handles: star rating state, textarea auto-grow,
 *          client validation, Formspree POST,
 *          coffee loader (3.5s min display),
 *          success screen transition, and reset.
 */

(function () {
  'use strict';

  /* ── DOM refs ──────────────────────────────────────────────── */
  const form       = document.getElementById('feedback-form');
  const loader     = document.getElementById('loader');
  const pageForm   = document.getElementById('page-form');
  const pageSuccess = document.getElementById('page-success');
  const submitBtn  = document.getElementById('submit-btn');
  const starRow    = document.getElementById('star-rating');

  if (!form) return;

  const FORMSPREE = 'https://formspree.io/f/xaqagppb';
  const LOADER_MIN_MS = 3500; // coffee loader minimum display time

  /* ── Config ────────────────────────────────────────────────── */
  const TEXT_FIELDS = [
    { id: 'q1_problem', errId: 'err-q1', fieldId: 'field-q1' },
    { id: 'q2_features', errId: 'err-q2', fieldId: 'field-q2' },
    { id: 'q3_switch',   errId: 'err-q3', fieldId: 'field-q3' },
  ];

  const RATING = { name: 'q4_interest', errId: 'err-q4', fieldId: 'field-q4' };

  let busy = false;

  /* ── Textarea: auto-grow ───────────────────────────────────── */
  TEXT_FIELDS.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.max(88, this.scrollHeight) + 'px';
    });
  });

  /* ── Star rating: update data-selected attribute ───────────── */
  const starInputs = form.querySelectorAll(`input[name="${RATING.name}"]`);
  starInputs.forEach(radio => {
    radio.addEventListener('change', () => {
      if (starRow) starRow.dataset.selected = radio.value;
      clearFieldErr(RATING.fieldId, RATING.errId);
    });
  });

  /* ── Live validation clearing ──────────────────────────────── */
  TEXT_FIELDS.forEach(({ id, errId, fieldId }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (el.value.trim()) clearFieldErr(fieldId, errId);
    });
  });

  /* ── Validation ────────────────────────────────────────────── */
  function validate() {
    let ok   = true;
    let first = null;

    TEXT_FIELDS.forEach(({ id, errId, fieldId }) => {
      const el = document.getElementById(id);
      clearFieldErr(fieldId, errId);
      if (!el || !el.value.trim()) {
        setFieldErr(fieldId, errId, 'This field is required.');
        ok = false;
        if (!first) first = el;
      }
    });

    clearFieldErr(RATING.fieldId, RATING.errId);
    const checked = form.querySelector(`input[name="${RATING.name}"]:checked`);
    if (!checked) {
      setFieldErr(RATING.fieldId, RATING.errId, 'Please select a rating.');
      ok = false;
      if (!first) first = starInputs[0];
    }

    if (first) {
      const offset = first.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      setTimeout(() => first.focus?.(), 240);
    }

    return ok;
  }

  /* ── Error helpers ─────────────────────────────────────────── */
  function setFieldErr(fieldId, errId, msg) {
    const field = document.getElementById(fieldId);
    const err   = document.getElementById(errId);
    if (field) field.classList.add('has-error');
    if (err)   { err.textContent = msg; err.classList.add('show'); }
  }

  function clearFieldErr(fieldId, errId) {
    const field = document.getElementById(fieldId);
    const err   = document.getElementById(errId);
    if (field) field.classList.remove('has-error');
    if (err)   { err.textContent = ''; err.classList.remove('show'); }
  }

  /* ── Loader helpers ────────────────────────────────────────── */
  function showLoader() {
    if (loader) {
      loader.classList.add('is-active');
      loader.removeAttribute('aria-hidden');
    }
  }

  function hideLoader() {
    if (loader) {
      loader.classList.remove('is-active');
      loader.setAttribute('aria-hidden', 'true');
    }
  }

  /* ── Show success screen ───────────────────────────────────── */
  function showSuccess() {
    // Fade out form page
    if (pageForm) {
      pageForm.style.opacity = '0';
      pageForm.style.pointerEvents = 'none';
    }

    // Fade in success page
    if (pageSuccess) {
      pageSuccess.classList.add('is-visible');
      pageSuccess.removeAttribute('aria-hidden');
      pageSuccess.setAttribute('aria-live', 'polite');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Reset ─────────────────────────────────────────────────── */
  window.resetPage = function () {
    // Hard reload is simplest and avoids any stale state
    window.location.reload();
  };

  /* ── Submit handler ────────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;
    if (!validate()) return;

    busy = true;
    submitBtn.disabled = true;
    showLoader();

    const loaderStart = Date.now();

    try {
      const res = await fetch(FORMSPREE, {
        method:  'POST',
        body:    new FormData(form),
        headers: { Accept: 'application/json' },
      });

      // Ensure loader shows for at least LOADER_MIN_MS (coffee experience)
      const elapsed   = Date.now() - loaderStart;
      const remaining = Math.max(0, LOADER_MIN_MS - elapsed);

      await delay(remaining);
      hideLoader();

      if (res.ok) {
        showSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg  = data?.errors?.[0]?.message
                   || 'Something went wrong — please try again.';
        showGlobalError(msg);
        submitBtn.disabled = false;
        busy = false;
      }

    } catch {
      const elapsed   = Date.now() - loaderStart;
      const remaining = Math.max(0, LOADER_MIN_MS - elapsed);
      await delay(remaining);
      hideLoader();
      showGlobalError('Network error — check your connection and try again.');
      submitBtn.disabled = false;
      busy = false;
    }
  });

  /* ── Global error toast ────────────────────────────────────── */
  function showGlobalError(msg) {
    document.querySelector('.global-err')?.remove();

    const el = document.createElement('p');
    el.className = 'global-err';
    el.textContent = msg;
    Object.assign(el.style, {
      fontSize:   '13px',
      color:      '#ff453a',
      textAlign:  'center',
      marginTop:  '8px',
      opacity:    '0',
      transition: 'opacity 200ms ease',
    });

    submitBtn.insertAdjacentElement('afterend', el);
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '1')));

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 220);
    }, 6000);
  }

  /* ── Utility ───────────────────────────────────────────────── */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

})();

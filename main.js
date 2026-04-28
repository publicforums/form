/**
 * Relay — Feedback Form
 * Handles: field validation, Formspree submission,
 *          loading state, success reveal, double-submit guard.
 */
(function () {
  'use strict';

  const form         = document.getElementById('relay-form');
  const submitBtn    = document.getElementById('submit-btn');
  const successPanel = document.getElementById('success-panel');

  // Field config: textarea id → error element id
  const fields = [
    { inputId: 'q1_problem', errId: 'err-q1', fieldId: 'field-q1' },
    { inputId: 'q2_features', errId: 'err-q2', fieldId: 'field-q2' },
    { inputId: 'q3_switch',   errId: 'err-q3', fieldId: 'field-q3' },
  ];

  let submitting = false;

  /* ── Auto-grow textareas ─────────────────────────────────── */
  fields.forEach(({ inputId }) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.max(120, this.scrollHeight) + 'px';
    });
  });

  /* ── Clear error on input ────────────────────────────────── */
  fields.forEach(({ inputId, errId, fieldId }) => {
    const el    = document.getElementById(inputId);
    const err   = document.getElementById(errId);
    const block = document.getElementById(fieldId);
    if (!el) return;

    el.addEventListener('input', function () {
      if (this.value.trim()) {
        clearError(block, err);
      }
    });
  });

  /* ── Validation ──────────────────────────────────────────── */
  function validate() {
    let ok = true;
    let firstInvalid = null;

    fields.forEach(({ inputId, errId, fieldId }) => {
      const el    = document.getElementById(inputId);
      const err   = document.getElementById(errId);
      const block = document.getElementById(fieldId);
      if (!el) return;

      // Clear first, then re-evaluate
      clearError(block, err);

      if (!el.value.trim()) {
        showError(block, err, 'This field is required — every answer helps.');
        ok = false;
        if (!firstInvalid) firstInvalid = el;
      }
    });

    if (firstInvalid) {
      // Scroll to first invalid field with a bit of offset
      const top = firstInvalid.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
      setTimeout(() => firstInvalid.focus(), 300);
    }

    return ok;
  }

  function showError(block, errEl, message) {
    if (block)  block.classList.add('is-invalid');
    if (errEl)  { errEl.textContent = message; errEl.classList.add('visible'); }
  }

  function clearError(block, errEl) {
    if (block)  block.classList.remove('is-invalid');
    if (errEl)  { errEl.textContent = ''; errEl.classList.remove('visible'); }
  }

  /* ── Loading state ───────────────────────────────────────── */
  function setLoading(state) {
    submitting = state;
    submitBtn.disabled = state;
    submitBtn.classList.toggle('is-loading', state);
    submitBtn.setAttribute('aria-busy', state ? 'true' : 'false');
  }

  /* ── Submit ──────────────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        revealSuccess();
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

  /* ── Success reveal ──────────────────────────────────────── */
  function revealSuccess() {
    // Fade out form
    form.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    form.style.opacity    = '0';
    form.style.transform  = 'translateY(-8px)';
    form.style.pointerEvents = 'none';

    setTimeout(() => {
      form.hidden = true;
      successPanel.hidden = false;
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);

    form.reset();
    // Reset auto-grown textareas
    fields.forEach(({ inputId }) => {
      const el = document.getElementById(inputId);
      if (el) el.style.height = '';
    });
  }

  /* ── Inline global error (below button) ─────────────────── */
  function showGlobalError(msg) {
    // Remove any existing
    const old = document.querySelector('.global-error');
    if (old) old.remove();

    const p = document.createElement('p');
    p.className = 'global-error';
    p.textContent = msg;
    p.style.cssText = [
      'font-size:13px',
      'color:#ff453a',
      'text-align:center',
      'margin-top:4px',
      'opacity:0',
      'transition:opacity 200ms ease',
    ].join(';');

    submitBtn.insertAdjacentElement('afterend', p);
    requestAnimationFrame(() => requestAnimationFrame(() => { p.style.opacity = '1'; }));

    setTimeout(() => {
      p.style.opacity = '0';
      setTimeout(() => p.remove(), 250);
    }, 6000);
  }

})();

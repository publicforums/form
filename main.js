/**
 * Relay — Feedback Form JS
 * Handles: validation, Formspree submission, success state,
 *          character counters, double-submit prevention
 */

(function () {
  'use strict';

  /* ── DOM refs ──────────────────────────────────────────── */
  const form        = document.getElementById('relay-form');
  const submitBtn   = document.getElementById('submit-btn');
  const successPanel = document.getElementById('success-panel');

  const fields = [
    { id: 'q1_problem', label: 'your biggest pain points' },
    { id: 'q2_features', label: 'must-have features' },
    { id: 'q3_switch',   label: 'what would trigger a switch' },
  ];

  let isSubmitting = false;

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    setupCharCounters();
    setupLiveValidation();
    form.addEventListener('submit', handleSubmit);
  }

  /* ── Character counters ────────────────────────────────── */
  function setupCharCounters() {
    fields.forEach(({ id }) => {
      const textarea = document.getElementById(id);
      if (!textarea) return;

      // The char-hint sits after the glow div
      const wrapper   = textarea.closest('.textarea-wrapper');
      const charHint  = wrapper.querySelector('.char-hint');

      if (!charHint) return;

      textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charHint.textContent = `${len} char${len !== 1 ? 's' : ''}`;
      });
    });
  }

  /* ── Live validation (on blur + on input after error) ──── */
  function setupLiveValidation() {
    fields.forEach(({ id }) => {
      const textarea = document.getElementById(id);
      if (!textarea) return;

      textarea.addEventListener('blur', () => {
        if (textarea.value.trim() === '') {
          showFieldError(textarea, 'This field is required');
        } else {
          clearFieldError(textarea);
        }
      });

      textarea.addEventListener('input', () => {
        const card = textarea.closest('.form-card');
        if (card && card.classList.contains('has-error')) {
          if (textarea.value.trim() !== '') {
            clearFieldError(textarea);
          }
        }
      });
    });
  }

  /* ── Field error helpers ───────────────────────────────── */
  function showFieldError(textarea, message) {
    const card = textarea.closest('.form-card');
    const errorEl = card?.querySelector('.field-error');

    textarea.classList.add('has-error');
    card?.classList.add('has-error');

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  function clearFieldError(textarea) {
    const card = textarea.closest('.form-card');
    const errorEl = card?.querySelector('.field-error');

    textarea.classList.remove('has-error');

    // Remove shake class without re-triggering animation
    if (card) {
      card.classList.remove('has-error');
      // Force reflow to allow re-triggering animation if needed later
      void card.offsetWidth;
    }

    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  /* ── Validate all fields ───────────────────────────────── */
  function validateAll() {
    let valid = true;
    let firstInvalid = null;

    fields.forEach(({ id }) => {
      const textarea = document.getElementById(id);
      if (!textarea) return;

      clearFieldError(textarea);

      if (textarea.value.trim() === '') {
        showFieldError(textarea, 'Please share your thoughts — every response helps.');
        valid = false;
        if (!firstInvalid) firstInvalid = textarea;
      }
    });

    if (firstInvalid) {
      // Smooth scroll to first invalid field with offset
      const rect = firstInvalid.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - 100;

      window.scrollTo({ top: targetY, behavior: 'smooth' });
      firstInvalid.focus({ preventScroll: true });
    }

    return valid;
  }

  /* ── Submit handler ────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateAll()) return;

    isSubmitting = true;
    setLoadingState(true);

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        showSuccess();
      } else {
        // Try to parse Formspree error
        const data = await response.json().catch(() => ({}));
        const errorMsg = data?.errors?.[0]?.message
          || 'Something went wrong. Please try again in a moment.';
        handleSubmitError(errorMsg);
      }
    } catch (err) {
      handleSubmitError('Network error — please check your connection and try again.');
    } finally {
      setLoadingState(false);
      isSubmitting = false;
    }
  }

  /* ── Loading state ─────────────────────────────────────── */
  function setLoadingState(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
    submitBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
  }

  /* ── Success ───────────────────────────────────────────── */
  function showSuccess() {
    // Fade out the form
    form.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    form.style.opacity    = '0';
    form.style.transform  = 'translateY(-10px)';

    setTimeout(() => {
      form.style.display = 'none';
      successPanel.hidden = false;

      // Scroll success panel into view
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);

    // Reset form data
    form.reset();
  }

  /* ── Submission error (inline) ─────────────────────────── */
  function handleSubmitError(message) {
    // Show error beneath the submit button
    const existingError = document.querySelector('.submit-error');
    if (existingError) existingError.remove();

    const errorEl = document.createElement('p');
    errorEl.className = 'submit-error';
    errorEl.textContent = message;
    errorEl.style.cssText = `
      font-size: 13px;
      color: #ff453a;
      text-align: center;
      margin-top: -4px;
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 200ms ease, transform 200ms ease;
    `;

    submitBtn.insertAdjacentElement('afterend', errorEl);

    // Trigger transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        errorEl.style.opacity = '1';
        errorEl.style.transform = 'translateY(0)';
      });
    });

    // Auto-remove after 6 seconds
    setTimeout(() => {
      errorEl.style.opacity = '0';
      setTimeout(() => errorEl.remove(), 250);
    }, 6000);
  }

  /* ── Subtle entrance stagger for form cards ────────────── */
  function observeCards() {
    if (!('IntersectionObserver' in window)) return;

    const cards = document.querySelectorAll('.form-card, .submit-wrap');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach((card) => observer.observe(card));
  }

  /* ── Textarea auto-grow ────────────────────────────────── */
  function setupAutoGrow() {
    fields.forEach(({ id }) => {
      const textarea = document.getElementById(id);
      if (!textarea) return;

      textarea.addEventListener('input', () => {
        // Reset height to auto so it can shrink
        textarea.style.height = 'auto';
        // Set to scroll height with a min
        textarea.style.height = Math.max(110, textarea.scrollHeight) + 'px';
      });
    });
  }

  /* ── Run ───────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    init();
    observeCards();
    setupAutoGrow();
  });

})();

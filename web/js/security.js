(() => {
  'use strict';

  const t = text => window.NeithI18n?.t?.(text) || text;
  const normalizeMessage = error => error?.message || 'The password could not be changed.';

  function setStatus(message = '', type = '') {
    const el = document.querySelector('[data-password-change-message]');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
  }


  function formatDate(value) {
    if (!value) return '—';
    try {
      const lang = document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES';
      return new Intl.DateTimeFormat(lang, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    } catch { return '—'; }
  }

  function setText(selector, value, statusClass = '') {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = value || '—';
      if (statusClass) el.className = statusClass;
    });
  }

  function renderAccountStatus() {
    const user = window.NeithAuth?.session?.user;
    if (!user) {
      setText('[data-security-email]', '—');
      setText('[data-security-email-status]', 'NO SESSION');
      setText('[data-security-provider]', '—');
      setText('[data-security-created]', '—');
      setText('[data-security-last-signin]', '—');
      return;
    }
    const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0] || (user.email ? 'email' : '—');
    const providerLabels = { email: 'Email', google: 'Google', discord: 'Discord' };
    setText('[data-security-email]', user.email || '—');
    setText('[data-security-email-status]', user.email_confirmed_at ? t('VERIFICADO') : t('PENDIENTE'), user.email_confirmed_at ? 'good' : 'warning');
    setText('[data-security-provider]', providerLabels[String(provider).toLowerCase()] || String(provider));
    setText('[data-security-created]', formatDate(user.created_at));
    setText('[data-security-last-signin]', formatDate(user.last_sign_in_at));
  }

  function togglePassword(button) {
    const shell = button.closest('.security-password-shell');
    const input = shell?.querySelector('input');
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.classList.toggle('is-visible', reveal);
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', (reveal ? 'Hide password' : 'Show password'));
  }

  async function changePassword(form) {
    const auth = window.NeithAuth;
    if (!auth?.configured || !auth.client) {
      setStatus(t('Supabase is not configured in this copy.'), 'warning');
      return;
    }
    const user = auth.session?.user;
    if (!user?.email) {
      setStatus('You must sign in to change your password.', 'error');
      return;
    }

    const currentPassword = String(form.elements.current_password?.value || '');
    const newPassword = String(form.elements.new_password?.value || '');
    const confirmPassword = String(form.elements.confirm_password?.value || '');
    if (currentPassword.length < 1) return setStatus('Enter your current password.', 'error');
    if (newPassword.length < 8) return setStatus('The new password must be at least 8 characters long.', 'error');
    if (newPassword !== confirmPassword) return setStatus('The new passwords do not match.', 'error');
    if (currentPassword === newPassword) return setStatus('The new password must be different from the current password.', 'error');

    const submit = form.querySelector('button[type="submit"]');
    const original = submit?.innerHTML || '';
    if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); submit.innerHTML = `<span>${t('CAMBIANDO…')}</span>`; }
    setStatus('Verifying your current password…', '');

    try {
      // Supabase Secure Password Change can require the current password in the
      // SAME updateUser request. Verifying it with signInWithPassword first is
      // not sufficient and causes: "Current password required when setting new password."
      const { error: updateError } = await auth.client.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });
      if (updateError) {
        const message = String(updateError.message || '').toLowerCase();
        if (message.includes('current password') || message.includes('invalid login credentials')) {
          throw new Error('The current password is incorrect.');
        }
        throw updateError;
      }
      form.reset();
      form.querySelectorAll('[data-security-password-toggle]').forEach(btn => {
        btn.classList.remove('is-visible');
        btn.setAttribute('aria-pressed', 'false');
        const input = btn.closest('.security-password-shell')?.querySelector('input');
        if (input) input.type = 'password';
      });
      setStatus(t('Password updated successfully.'), 'success');
    } catch (error) {
      setStatus(normalizeMessage(error), 'error');
    } finally {
      if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); submit.innerHTML = original; }
    }
  }

  function init() {
    renderAccountStatus();
    window.addEventListener('neith:authchange', renderAccountStatus);
    window.addEventListener('neith:languagechange', renderAccountStatus);
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-security-password-toggle]');
      if (button) togglePassword(button);
    });
    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-password-change-form]');
      if (!form) return;
      event.preventDefault();
      changePassword(form);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

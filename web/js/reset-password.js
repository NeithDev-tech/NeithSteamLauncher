(() => {
  'use strict';
  const cfg = window.NEITH_CONFIG || {};
  const configured = Boolean(
    window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey &&
    !String(cfg.supabaseUrl).includes('YOUR_PROJECT') &&
    !String(cfg.supabaseAnonKey).includes('YOUR_SUPABASE_ANON_KEY')
  );
  const client = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  const form = document.querySelector('[data-reset-form]');
  const message = document.querySelector('[data-reset-message]');
  let recoveryReady = false;

  const setMessage = (text, type = '') => {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
  };

  function togglePassword(button) {
    const input = button.closest('.password-field')?.querySelector('input[type="password"],input[type="text"]');
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.classList.toggle('is-visible', reveal);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-password-toggle]');
    if (button) togglePassword(button);
  });

  async function detectRecovery() {
    if (!client) {
      setMessage('La conexión segura con Neith no está configurada.', 'error');
      if (form) form.querySelector('button[type="submit"]').disabled = true;
      return;
    }
    const { data } = await client.auth.getSession();
    recoveryReady = Boolean(data?.session?.user);
    if (!recoveryReady) {
      setMessage('Este enlace de recuperación no es válido o ha caducado. Solicita uno nuevo desde Iniciar sesión.', 'error');
      if (form) form.querySelector('button[type="submit"]').disabled = true;
    }
  }

  client?.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || session?.user) {
      recoveryReady = true;
      setMessage('Enlace verificado. Ya puedes crear tu nueva contraseña.', 'success');
      const submit = form?.querySelector('button[type="submit"]');
      if (submit) submit.disabled = false;
    }
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    if (values.password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (values.password !== values.password_confirm) {
      setMessage('Las dos contraseñas no coinciden.', 'error');
      return;
    }
    if (!client || !recoveryReady) {
      setMessage('El enlace de recuperación no está activo. Solicita uno nuevo.', 'error');
      return;
    }
    const original = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'GUARDANDO…';
    setMessage('');
    try {
      const { error } = await client.auth.updateUser({ password: values.password });
      if (error) throw error;
      await client.auth.signOut();
      form.reset();
      setMessage('Contraseña actualizada correctamente. Ya puedes iniciar sesión con la nueva contraseña.', 'success');
      setTimeout(() => { window.location.href = '../?login=1&password=updated'; }, 1600);
    } catch (error) {
      setMessage(error?.message || 'No se pudo actualizar la contraseña.', 'error');
      submit.disabled = false;
      submit.textContent = original;
    }
  });

  detectRecovery();
})();

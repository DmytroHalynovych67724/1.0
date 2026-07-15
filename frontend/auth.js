(() => {
  'use strict';

  const TM = window.NaShary;
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  function showPanel(name) {
    const login = name === 'login';
    loginPanel.hidden = !login;
    registerPanel.hidden = login;
    loginTab.classList.toggle('is-active', login);
    registerTab.classList.toggle('is-active', !login);
    loginTab.setAttribute('aria-selected', String(login));
    registerTab.setAttribute('aria-selected', String(!login));
    document.title = `${login ? 'Вхід' : 'Реєстрація'} — NaShary`;
    const field = document.getElementById(login ? 'loginUsername' : 'registerUsername');
    window.setTimeout(() => field.focus(), 0);
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach((node) => { node.textContent = ''; });
    form.querySelectorAll('input').forEach((input) => input.removeAttribute('aria-invalid'));
  }

  function setFieldError(id, message) {
    const field = document.getElementById(id);
    const error = document.querySelector(`[data-error-for="${id}"]`);
    if (field) field.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
  }

  function validateLogin() {
    clearErrors(loginForm);
    let valid = true;
    if (document.getElementById('loginUsername').value.trim().length < 3) {
      setFieldError('loginUsername', 'Введіть логін (щонайменше 3 символи).');
      valid = false;
    }
    if (!document.getElementById('loginPassword').value) {
      setFieldError('loginPassword', 'Введіть пароль.');
      valid = false;
    }
    return valid;
  }

  function validateRegister() {
    clearErrors(registerForm);
    let valid = true;
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    if (username.length < 3 || username.length > 32) {
      setFieldError('registerUsername', 'Логін має містити від 3 до 32 символів.');
      valid = false;
    }
    if (password.length < 8) {
      setFieldError('registerPassword', 'Пароль має містити щонайменше 8 символів.');
      valid = false;
    }
    if (password !== confirm) {
      setFieldError('registerConfirm', 'Паролі не збігаються.');
      valid = false;
    }
    if (!document.getElementById('termsConsent').checked) {
      document.getElementById('registerMessage').textContent = 'Потрібно погодитися з правилами сервісу.';
      valid = false;
    }
    return valid;
  }

  function getSafeNext() {
    const next = new URLSearchParams(window.location.search).get('next') || 'index.html';
    if (!next || next.startsWith('//') || /^[a-z]+:/i.test(next) || !/^[\w./?=&%#-]+$/.test(next)) return 'index.html';
    return next;
  }

  async function login(username, password) {
    const body = await TM.apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (!body?.token) throw new Error('Сервер не повернув токен авторизації.');
    TM.setSession(body.token, body.user || null);
    try {
      const user = await TM.getCurrentUser(true);
      TM.setSession(body.token, user || body.user || { username });
    } catch (error) {
      if (!error.isNetworkError) {
        TM.clearSession();
        throw error;
      }
      TM.setSession(body.token, body.user || { username });
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.getElementById('loginMessage');
    if (!validateLogin()) return;
    const button = document.getElementById('loginSubmit');
    button.disabled = true;
    button.textContent = 'Входимо…';
    message.textContent = '';
    try {
      await login(document.getElementById('loginUsername').value.trim(), document.getElementById('loginPassword').value);
      message.classList.add('is-success');
      message.textContent = 'Успішний вхід. Перенаправляємо…';
      window.setTimeout(() => { window.location.href = getSafeNext(); }, 350);
    } catch (error) {
      message.classList.remove('is-success');
      if (error.status === 401) message.textContent = 'Неправильний логін або пароль.';
      else if (error.status === 429) message.textContent = 'Забагато спроб. Спробуйте трохи пізніше.';
      else message.textContent = error.message || 'Не вдалося увійти.';
    } finally {
      button.disabled = false;
      button.textContent = 'Увійти';
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.getElementById('registerMessage');
    message.textContent = '';
    if (!validateRegister()) return;
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const button = document.getElementById('registerSubmit');
    button.disabled = true;
    button.textContent = 'Створюємо акаунт…';
    try {
      await TM.apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
      await login(username, password);
      message.classList.add('is-success');
      message.textContent = 'Акаунт створено. Перенаправляємо…';
      window.setTimeout(() => { window.location.href = getSafeNext(); }, 450);
    } catch (error) {
      message.classList.remove('is-success');
      if (error.status === 409) message.textContent = 'Користувач із таким логіном уже існує.';
      else if (error.status === 400) message.textContent = error.message || 'Перевірте введені дані.';
      else message.textContent = error.message || 'Не вдалося створити акаунт.';
    } finally {
      button.disabled = false;
      button.textContent = 'Створити акаунт';
    }
  });

  loginTab.addEventListener('click', () => showPanel('login'));
  registerTab.addEventListener('click', () => showPanel('register'));
  document.querySelectorAll('[data-show-register]').forEach((button) => button.addEventListener('click', () => showPanel('register')));
  document.querySelectorAll('[data-show-login]').forEach((button) => button.addEventListener('click', () => showPanel('login')));
  document.querySelectorAll('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? '◌' : '◉';
    button.setAttribute('aria-label', show ? 'Сховати пароль' : 'Показати пароль');
  }));

  const requestedAction = new URLSearchParams(window.location.search).get('action');
  showPanel(requestedAction === 'register' ? 'register' : 'login');

  if (TM.getToken()) {
    TM.getCurrentUser(true).then((user) => {
      if (!user) return;
      const message = document.getElementById('loginMessage');
      message.classList.add('is-success');
      message.textContent = `Ви вже увійшли як ${user.username || user.name || 'користувач'}.`;
    }).catch(() => {});
  }
})();

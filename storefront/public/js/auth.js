// auth.js — login / register / session state
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

function getToken() { return localStorage.getItem('token'); }

function setSession(user, token) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
  refreshAuthUI();
}

function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  refreshAuthUI();
  toast('Logged out', 'info');
}

function refreshAuthUI() {
  const user = getUser();
  const authArea = document.getElementById('auth-area');
  const userArea = document.getElementById('user-area');
  const usernameDisplay = document.getElementById('username-display');

  if (user) {
    if (authArea) authArea.style.display = 'none';
    if (userArea) userArea.style.display = 'flex';
    if (usernameDisplay) usernameDisplay.textContent = `👤 ${user.username}`;
  } else {
    if (authArea) authArea.style.display = 'flex';
    if (userArea) userArea.style.display = 'none';
  }
}

async function register(e) {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.classList.add('hidden');

  const body = {
    username: document.getElementById('reg-username').value.trim(),
    email:    document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
  };

  try {
    const user = await UsersAPI.register(body);
    // Generate a demo JWT-shaped token from user id (order-service validates it)
    const demoToken = btoa(JSON.stringify({ header: 'demo' })) + '.' +
                      btoa(JSON.stringify({ id: user.id, email: user.email })) + '.sig';
    setSession(user, demoToken);
    closeAllModals();
    toast(`Welcome, ${user.username}! 🎉`, 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function login(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  // user-service has no login endpoint in this demo — match by email from localStorage
  // In a real app this would call a /auth/login endpoint
  const email = document.getElementById('login-email').value.trim();
  const stored = getUser();

  if (stored && stored.email === email) {
    const demoToken = btoa(JSON.stringify({ header: 'demo' })) + '.' +
                      btoa(JSON.stringify({ id: stored.id, email: stored.email })) + '.sig';
    setSession(stored, demoToken);
    closeAllModals();
    toast(`Welcome back, ${stored.username}!`, 'success');
  } else {
    errEl.textContent = 'No matching account found. Please register first.';
    errEl.classList.remove('hidden');
  }
}

// Restore session on every page load
document.addEventListener('DOMContentLoaded', refreshAuthUI);

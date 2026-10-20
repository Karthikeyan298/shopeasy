// ui.js — modal helpers and toast notifications
function showModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
  document.getElementById('modal-backdrop')?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
  const anyOpen = document.querySelectorAll('.modal:not(.hidden)').length > 0;
  if (!anyOpen) document.getElementById('modal-backdrop')?.classList.add('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-backdrop')?.classList.add('hidden');
}

function switchModal(from, to) {
  closeModal(from);
  showModal(to);
}

function toast(message, type = 'info') {
  const area = document.getElementById('toast-area');
  if (!area) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  area.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

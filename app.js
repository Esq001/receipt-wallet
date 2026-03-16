// ========== Data Layer ==========
const STORAGE_KEY = 'receiptvault_data';
const CATEGORY_ICONS = {
  groceries: '\u{1F6D2}',
  dining: '\u{1F37D}\uFE0F',
  shopping: '\u{1F6CD}\uFE0F',
  services: '\u{1F527}',
  travel: '\u2708\uFE0F',
  health: '\u{1FA7A}',
  other: '\u{1F4CB}'
};

function loadReceipts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveReceipts(receipts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ========== State ==========
let receipts = loadReceipts();
let activeFilter = 'all';
let searchQuery = '';
let selectedReceiptId = null;

// Seed demo data if empty
if (receipts.length === 0) {
  const today = new Date();
  const demoData = [
    { store: 'Whole Foods Market', amount: 87.43, category: 'groceries', date: formatDateISO(daysAgo(0)), notes: 'Weekly grocery run. Paid with Apple Pay.' },
    { store: 'Chipotle', amount: 14.25, category: 'dining', date: formatDateISO(daysAgo(1)), notes: 'Lunch — burrito bowl + guac' },
    { store: 'Amazon', amount: 34.99, category: 'shopping', date: formatDateISO(daysAgo(2)), notes: 'USB-C hub for laptop' },
    { store: 'Uber', amount: 22.50, category: 'travel', date: formatDateISO(daysAgo(3)), notes: 'Ride to airport' },
    { store: 'CVS Pharmacy', amount: 12.89, category: 'health', date: formatDateISO(daysAgo(3)), notes: 'Cold medicine, vitamin C' },
    { store: 'Netflix', amount: 15.49, category: 'services', date: formatDateISO(daysAgo(5)), notes: 'Monthly subscription' },
    { store: 'Target', amount: 63.21, category: 'shopping', date: formatDateISO(daysAgo(7)), notes: 'Household items, cleaning supplies' },
    { store: 'Starbucks', amount: 6.75, category: 'dining', date: formatDateISO(daysAgo(7)), notes: 'Oat milk latte + croissant' },
    { store: 'Shell Gas Station', amount: 48.30, category: 'travel', date: formatDateISO(daysAgo(10)), notes: 'Full tank, regular unleaded' },
    { store: 'Trader Joe\'s', amount: 52.18, category: 'groceries', date: formatDateISO(daysAgo(12)), notes: 'Snacks and frozen meals' },
    { store: 'AT&T', amount: 85.00, category: 'services', date: formatDateISO(daysAgo(14)), notes: 'Monthly phone bill' },
    { store: 'Home Depot', amount: 29.97, category: 'other', date: formatDateISO(daysAgo(18)), notes: 'Light bulbs, batteries, duct tape' },
  ];
  receipts = demoData.map(d => ({ id: generateId(), image: null, ...d }));
  saveReceipts(receipts);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDateISO(d) {
  return d.toISOString().split('T')[0];
}

// ========== DOM References ==========
const $ = (sel) => document.querySelector(sel);
const receiptList = $('#receiptList');
const emptyState = $('#emptyState');
const searchBar = $('#searchBar');
const searchInput = $('#searchInput');
const addModal = $('#addModal');
const detailModal = $('#detailModal');
const menuOverlay = $('#menuOverlay');
const sourceOptions = $('#sourceOptions');
const receiptForm = $('#receiptForm');
const scanView = $('#scanView');
const emailView = $('#emailView');
const photoView = $('#photoView');

// ========== Render ==========
function render() {
  let filtered = receipts;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(r => r.category === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      r.store.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by date
  const groups = {};
  filtered.forEach(r => {
    const label = getDateLabel(r.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(r);
  });

  // Render
  if (filtered.length === 0) {
    receiptList.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    let html = '';
    for (const [label, items] of Object.entries(groups)) {
      html += `<div class="date-group"><div class="date-label">${label}</div>`;
      items.forEach(r => {
        html += `
          <div class="receipt-card" data-id="${r.id}">
            <div class="receipt-icon icon-${r.category}">${CATEGORY_ICONS[r.category] || '\u{1F4CB}'}</div>
            <div class="receipt-info">
              <div class="receipt-store">${escapeHtml(r.store)}</div>
              <div class="receipt-meta">
                <span class="badge cat-${r.category}">${r.category}</span>
                <span>${formatDate(r.date)}</span>
              </div>
            </div>
            <div class="receipt-amount">$${Number(r.amount).toFixed(2)}</div>
          </div>
        `;
      });
      html += '</div>';
    }
    receiptList.innerHTML = html;
  }

  updateStats();
}

function getDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today - target) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This Week';
  if (diff < 14) return 'Last Week';
  if (diff < 30) return 'This Month';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateStats() {
  // Total receipts
  $('#totalReceipts').textContent = receipts.length;

  // This month's spending
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTotal = receipts
    .filter(r => new Date(r.date + 'T12:00:00') >= monthStart)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  $('#totalSpent').textContent = '$' + monthTotal.toFixed(0);

  // Top category
  if (receipts.length > 0) {
    const counts = {};
    receipts.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    $('#topCategory').textContent = top.charAt(0).toUpperCase() + top.slice(1);
  } else {
    $('#topCategory').textContent = '\u2014';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== Event Handlers ==========

// Search toggle
$('#searchToggle').addEventListener('click', () => {
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    searchQuery = '';
    render();
  }
});

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  render();
});

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    render();
  });
});

// Receipt card click
receiptList.addEventListener('click', (e) => {
  const card = e.target.closest('.receipt-card');
  if (!card) return;
  const id = card.dataset.id;
  showDetail(id);
});

function showDetail(id) {
  const r = receipts.find(r => r.id === id);
  if (!r) return;
  selectedReceiptId = id;

  $('#detailStore').textContent = r.store;
  $('#detailAmount').textContent = '$' + Number(r.amount).toFixed(2);
  $('#detailDate').textContent = new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const catEl = $('#detailCategory');
  catEl.textContent = r.category;
  catEl.className = 'detail-category badge cat-' + r.category;
  $('#detailNotes').textContent = r.notes || '';

  const imgContainer = $('#detailImage');
  if (r.image) {
    $('#detailImg').src = r.image;
    imgContainer.classList.remove('hidden');
  } else {
    imgContainer.classList.add('hidden');
  }

  detailModal.classList.remove('hidden');
}

$('#closeDetailModal').addEventListener('click', () => {
  detailModal.classList.add('hidden');
  selectedReceiptId = null;
});

$('#deleteReceipt').addEventListener('click', () => {
  if (!selectedReceiptId) return;
  if (confirm('Delete this receipt?')) {
    receipts = receipts.filter(r => r.id !== selectedReceiptId);
    saveReceipts(receipts);
    detailModal.classList.add('hidden');
    selectedReceiptId = null;
    render();
  }
});

// Add modal
$('#addBtn').addEventListener('click', () => {
  resetAddModal();
  addModal.classList.remove('hidden');
});

$('#closeAddModal').addEventListener('click', () => {
  addModal.classList.add('hidden');
});

function resetAddModal() {
  sourceOptions.classList.remove('hidden');
  receiptForm.classList.add('hidden');
  scanView.classList.add('hidden');
  emailView.classList.add('hidden');
  photoView.classList.add('hidden');
  receiptForm.reset();
  $('#imagePreview').classList.add('hidden');
  // Set default date to today
  $('#date').value = formatDateISO(new Date());
}

// Source selection
document.querySelectorAll('.source-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const source = btn.dataset.source;
    sourceOptions.classList.add('hidden');
    if (source === 'manual') {
      receiptForm.classList.remove('hidden');
    } else if (source === 'camera') {
      scanView.classList.remove('hidden');
    } else if (source === 'email') {
      emailView.classList.remove('hidden');
    } else if (source === 'photo') {
      photoView.classList.remove('hidden');
    }
  });
});

// Back buttons
$('#backFromScan').addEventListener('click', resetAddModal);
$('#backFromEmail').addEventListener('click', resetAddModal);
$('#backFromPhoto').addEventListener('click', resetAddModal);

// Image upload
$('#imageUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $('#previewImg').src = reader.result;
    $('#imagePreview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

$('#removeImg').addEventListener('click', () => {
  $('#imageUpload').value = '';
  $('#imagePreview').classList.add('hidden');
});

// Form submit
receiptForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const store = $('#storeName').value.trim();
  const amount = parseFloat($('#amount').value);
  const date = $('#date').value;
  const category = $('#category').value;
  const notes = $('#notes').value.trim();
  const imgEl = $('#previewImg');
  const image = $('#imagePreview').classList.contains('hidden') ? null : imgEl.src;

  if (!store || isNaN(amount) || !date) return;

  const receipt = { id: generateId(), store, amount, date, category, notes, image };
  receipts.push(receipt);
  saveReceipts(receipts);
  addModal.classList.add('hidden');
  render();
});

// Menu
$('#menuBtn').addEventListener('click', () => {
  menuOverlay.classList.remove('hidden');
});

menuOverlay.addEventListener('click', (e) => {
  if (e.target === menuOverlay) {
    menuOverlay.classList.add('hidden');
  }
});

// Close modals on overlay click
addModal.addEventListener('click', (e) => {
  if (e.target === addModal) addModal.classList.add('hidden');
});
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) detailModal.classList.add('hidden');
});

// ========== Init ==========
render();

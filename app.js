// ========== Firebase Init ==========
const firebaseConfig = {
  apiKey: "AIzaSyBFCptR8Q9b5xHAwX_OAEvRSSWgZS9GFTo",
  authDomain: "erin-s-idea.firebaseapp.com",
  projectId: "erin-s-idea",
  storageBucket: "erin-s-idea.firebasestorage.app",
  messagingSenderId: "217387923666",
  appId: "1:217387923666:web:34ad751075521ab3d5150b"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ========== Constants ==========
const CATEGORY_ICONS = {
  groceries: '\u{1F6D2}',
  dining: '\u{1F37D}\uFE0F',
  shopping: '\u{1F6CD}\uFE0F',
  services: '\u{1F527}',
  travel: '\u2708\uFE0F',
  health: '\u{1FA7A}',
  other: '\u{1F4CB}'
};

// ========== Data Layer (scoped per user) ==========
let currentUserId = null;

function storageKey() {
  return 'receiptvault_' + currentUserId;
}

function loadReceipts() {
  try {
    return JSON.parse(localStorage.getItem(storageKey())) || [];
  } catch { return []; }
}

function saveReceipts(data) {
  localStorage.setItem(storageKey(), JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ========== State ==========
let receipts = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedReceiptId = null;

function seedDemoData() {
  const demoData = [
    { store: 'Whole Foods Market', amount: 87.43, category: 'groceries', date: formatDateISO(daysAgo(0)), notes: 'Weekly grocery run. Paid with Apple Pay.' },
    { store: 'Chipotle', amount: 14.25, category: 'dining', date: formatDateISO(daysAgo(1)), notes: 'Lunch \u2014 burrito bowl + guac' },
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
const authScreen = $('#authScreen');
const appEl = $('#app');

// ========== Auth State ==========
let isSignUp = false;

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserId = user.uid;
    receipts = loadReceipts();
    if (receipts.length === 0) seedDemoData();
    showApp(user);
  } else {
    currentUserId = null;
    showAuth();
  }
});

function showAuth() {
  authScreen.classList.remove('hidden');
  appEl.classList.add('hidden');
}

function showApp(user) {
  authScreen.classList.add('hidden');
  appEl.classList.remove('hidden');

  // Set user initial in avatar
  const email = user.email || '';
  $('#userInitial').textContent = email.charAt(0).toUpperCase();
  $('#menuUserEmail').textContent = email;

  render();
}

// ========== Auth Form ==========
const signInForm = $('#signInForm');
const authEmail = $('#authEmail');
const authPassword = $('#authPassword');
const authError = $('#authError');
const authSubmitBtn = $('#authSubmitBtn');
const authToggleBtn = $('#authToggleBtn');
const authToggleText = $('#authToggleText');
const forgotPasswordBtn = $('#forgotPasswordBtn');

authToggleBtn.addEventListener('click', () => {
  isSignUp = !isSignUp;
  if (isSignUp) {
    authSubmitBtn.textContent = 'Create Account';
    authToggleText.textContent = 'Already have an account?';
    authToggleBtn.textContent = 'Sign In';
    authPassword.autocomplete = 'new-password';
  } else {
    authSubmitBtn.textContent = 'Sign In';
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = 'Sign Up';
    authPassword.autocomplete = 'current-password';
  }
  authError.classList.add('hidden');
});

signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) return;

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = isSignUp ? 'Creating Account...' : 'Signing In...';
  authError.classList.add('hidden');

  try {
    if (isSignUp) {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (err) {
    console.error('Auth error:', err.code, err.message);
    authError.textContent = getAuthErrorMessage(err.code);
    authError.classList.remove('hidden');
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
  }
});

forgotPasswordBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) {
    authError.textContent = 'Enter your email above, then tap Forgot Password.';
    authError.classList.remove('hidden');
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    authError.textContent = 'Password reset email sent! Check your inbox.';
    authError.classList.remove('hidden');
    authError.style.background = '#e8f5e9';
    authError.style.color = '#2e7d32';
    setTimeout(() => {
      authError.style.background = '';
      authError.style.color = '';
    }, 4000);
  } catch (err) {
    authError.textContent = getAuthErrorMessage(err.code);
    authError.classList.remove('hidden');
  }
});

function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password. Try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
}

// Sign out
$('#signOutBtn').addEventListener('click', () => {
  auth.signOut();
  $('#menuOverlay').classList.add('hidden');
});

// User avatar click — open menu
$('#userAvatarBtn').addEventListener('click', () => {
  $('#menuOverlay').classList.remove('hidden');
});

// ========== Render ==========
function render() {
  const receiptList = $('#receiptList');
  const emptyState = $('#emptyState');

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
  $('#totalReceipts').textContent = receipts.length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTotal = receipts
    .filter(r => new Date(r.date + 'T12:00:00') >= monthStart)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  $('#totalSpent').textContent = '$' + monthTotal.toFixed(0);

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
  const searchBar = $('#searchBar');
  const searchInput = $('#searchInput');
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    searchQuery = '';
    render();
  }
});

$('#searchInput').addEventListener('input', (e) => {
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
$('#receiptList').addEventListener('click', (e) => {
  const card = e.target.closest('.receipt-card');
  if (!card) return;
  showDetail(card.dataset.id);
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

  $('#detailModal').classList.remove('hidden');
}

$('#closeDetailModal').addEventListener('click', () => {
  $('#detailModal').classList.add('hidden');
  selectedReceiptId = null;
});

$('#deleteReceipt').addEventListener('click', () => {
  if (!selectedReceiptId) return;
  if (confirm('Delete this receipt?')) {
    receipts = receipts.filter(r => r.id !== selectedReceiptId);
    saveReceipts(receipts);
    $('#detailModal').classList.add('hidden');
    selectedReceiptId = null;
    render();
  }
});

// Add modal
$('#addBtn').addEventListener('click', () => {
  resetAddModal();
  $('#addModal').classList.remove('hidden');
});

$('#closeAddModal').addEventListener('click', () => {
  $('#addModal').classList.add('hidden');
});

function resetAddModal() {
  $('#sourceOptions').classList.remove('hidden');
  $('#receiptForm').classList.add('hidden');
  $('#scanView').classList.add('hidden');
  $('#emailView').classList.add('hidden');
  $('#photoView').classList.add('hidden');
  $('#receiptForm').reset();
  $('#imagePreview').classList.add('hidden');
  $('#date').value = formatDateISO(new Date());
  // Reset email scanner steps
  $('#emailConnectStep').classList.remove('hidden');
  $('#emailScanningStep').classList.add('hidden');
  $('#emailResultsStep').classList.add('hidden');
  $('#emailNoResults').classList.add('hidden');
}

// Source selection
document.querySelectorAll('.source-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const source = btn.dataset.source;
    $('#sourceOptions').classList.add('hidden');
    if (source === 'manual') {
      $('#receiptForm').classList.remove('hidden');
    } else if (source === 'camera') {
      $('#scanView').classList.remove('hidden');
    } else if (source === 'email') {
      $('#emailView').classList.remove('hidden');
    } else if (source === 'photo') {
      $('#photoView').classList.remove('hidden');
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
$('#receiptForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const store = $('#storeName').value.trim();
  const amount = parseFloat($('#amount').value);
  const date = $('#date').value;
  const category = $('#category').value;
  const notes = $('#notes').value.trim();
  const image = $('#imagePreview').classList.contains('hidden') ? null : $('#previewImg').src;

  if (!store || isNaN(amount) || !date) return;

  receipts.push({ id: generateId(), store, amount, date, category, notes, image });
  saveReceipts(receipts);
  $('#addModal').classList.add('hidden');
  render();
});

// Menu
$('#menuBtn').addEventListener('click', () => {
  $('#menuOverlay').classList.remove('hidden');
});

$('#menuOverlay').addEventListener('click', (e) => {
  if (e.target === $('#menuOverlay')) {
    $('#menuOverlay').classList.add('hidden');
  }
});

// Close modals on overlay click
$('#addModal').addEventListener('click', (e) => {
  if (e.target === $('#addModal')) $('#addModal').classList.add('hidden');
});
$('#detailModal').addEventListener('click', (e) => {
  if (e.target === $('#detailModal')) $('#detailModal').classList.add('hidden');
});

// ========== Gmail Receipt Scanner ==========
const GMAIL_CLIENT_ID = '217387923666-tlktffajr85e87auddssv766qrj282o6.apps.googleusercontent.com';
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let gmailAccessToken = null;
let foundEmailReceipts = [];

// Known receipt senders and their categories
const RECEIPT_SENDERS = {
  'amazon': { name: 'Amazon', category: 'shopping' },
  'target': { name: 'Target', category: 'shopping' },
  'walmart': { name: 'Walmart', category: 'shopping' },
  'costco': { name: 'Costco', category: 'shopping' },
  'bestbuy': { name: 'Best Buy', category: 'shopping' },
  'apple': { name: 'Apple', category: 'shopping' },
  'uber': { name: 'Uber', category: 'travel' },
  'lyft': { name: 'Lyft', category: 'travel' },
  'doordash': { name: 'DoorDash', category: 'dining' },
  'grubhub': { name: 'Grubhub', category: 'dining' },
  'ubereats': { name: 'Uber Eats', category: 'dining' },
  'instacart': { name: 'Instacart', category: 'groceries' },
  'netflix': { name: 'Netflix', category: 'services' },
  'spotify': { name: 'Spotify', category: 'services' },
  'hulu': { name: 'Hulu', category: 'services' },
  'venmo': { name: 'Venmo', category: 'other' },
  'paypal': { name: 'PayPal', category: 'other' },
  'square': { name: 'Square', category: 'other' },
  'starbucks': { name: 'Starbucks', category: 'dining' },
  'chipotle': { name: 'Chipotle', category: 'dining' },
  'cvs': { name: 'CVS', category: 'health' },
  'walgreens': { name: 'Walgreens', category: 'health' },
  'homedepot': { name: 'Home Depot', category: 'other' },
  'lowes': { name: "Lowe's", category: 'other' },
};

$('#connectGmailBtn').addEventListener('click', () => {
  if (!GMAIL_CLIENT_ID) {
    alert('Gmail OAuth Client ID not configured yet. See setup instructions.');
    return;
  }
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GMAIL_CLIENT_ID,
    scope: GMAIL_SCOPES,
    callback: (response) => {
      if (response.access_token) {
        gmailAccessToken = response.access_token;
        scanGmail();
      }
    },
  });
  tokenClient.requestAccessToken();
});

$('#retryScanBtn').addEventListener('click', () => {
  if (gmailAccessToken) {
    scanGmail();
  } else {
    $('#emailNoResults').classList.add('hidden');
    $('#emailConnectStep').classList.remove('hidden');
  }
});

async function scanGmail() {
  // Show scanning state
  $('#emailConnectStep').classList.add('hidden');
  $('#emailNoResults').classList.add('hidden');
  $('#emailResultsStep').classList.add('hidden');
  $('#emailScanningStep').classList.remove('hidden');

  foundEmailReceipts = [];

  try {
    // Search for receipt-like emails from the last 90 days
    const query = 'subject:(receipt OR order OR confirmation OR invoice OR payment) newer_than:90d -is:draft';
    $('#scanStatus').textContent = 'Searching for receipt emails...';

    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: { Authorization: `Bearer ${gmailAccessToken}` } }
    );

    if (!searchRes.ok) throw new Error('Gmail API error');
    const searchData = await searchRes.json();
    const messages = searchData.messages || [];

    if (messages.length === 0) {
      showNoResults();
      return;
    }

    $('#scanStatus').textContent = `Found ${messages.length} potential receipts, analyzing...`;

    // Fetch message details (batch of first 20)
    const toFetch = messages.slice(0, 20);
    const details = await Promise.all(
      toFetch.map(msg =>
        fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${gmailAccessToken}` } }
        ).then(r => r.json())
      )
    );

    // Parse each email for receipt info
    for (const msg of details) {
      const parsed = parseEmailForReceipt(msg);
      if (parsed) {
        foundEmailReceipts.push(parsed);
      }
    }

    if (foundEmailReceipts.length === 0) {
      showNoResults();
      return;
    }

    showEmailResults();
  } catch (err) {
    console.error('Gmail scan error:', err);
    $('#scanStatus').textContent = 'Error scanning emails. Please try again.';
    setTimeout(() => {
      $('#emailScanningStep').classList.add('hidden');
      $('#emailConnectStep').classList.remove('hidden');
    }, 2000);
  }
}

function parseEmailForReceipt(msg) {
  const headers = {};
  (msg.payload?.headers || []).forEach(h => {
    headers[h.name.toLowerCase()] = h.value;
  });

  const from = (headers.from || '').toLowerCase();
  const subject = headers.subject || '';
  const dateStr = headers.date || '';

  // Match sender to known merchants
  let store = null;
  let category = 'other';

  for (const [key, info] of Object.entries(RECEIPT_SENDERS)) {
    if (from.includes(key)) {
      store = info.name;
      category = info.category;
      break;
    }
  }

  // If no known sender, try to extract from the "From" name
  if (!store) {
    const fromMatch = headers.from?.match(/^"?([^"<]+)"?\s*</);
    if (fromMatch) {
      store = fromMatch[1].trim();
    } else {
      store = from.split('@')[0];
    }
    // Skip if it looks like a personal email
    if (store.length < 2 || store.includes(' ')) {
      // Keep it, might be a business name
    }
  }

  // Try to extract amount from subject
  const amountMatch = subject.match(/\$\s?([\d,]+\.?\d{0,2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  // Parse date
  let date;
  try {
    const d = new Date(dateStr);
    date = d.toISOString().split('T')[0];
  } catch {
    date = formatDateISO(new Date());
  }

  // Skip if no useful data
  if (!store) return null;

  return {
    id: 'email_' + msg.id,
    store: store,
    amount: amount || 0,
    category: category,
    date: date,
    notes: 'Imported from email: ' + subject,
    image: null,
    selected: true,
    emailId: msg.id,
  };
}

function showNoResults() {
  $('#emailScanningStep').classList.add('hidden');
  $('#emailNoResults').classList.remove('hidden');
}

function showEmailResults() {
  $('#emailScanningStep').classList.add('hidden');
  $('#emailResultsStep').classList.remove('hidden');
  $('#foundCount').textContent = foundEmailReceipts.length;

  const list = $('#emailResultsList');
  list.innerHTML = foundEmailReceipts.map((r, i) => `
    <label class="email-result-item">
      <input type="checkbox" data-index="${i}" ${r.selected ? 'checked' : ''}>
      <div class="email-result-info">
        <div class="email-result-store">${escapeHtml(r.store)}</div>
        <div class="email-result-meta">${formatDate(r.date)} &middot; ${r.category}</div>
      </div>
      <div class="email-result-amount">${r.amount > 0 ? '$' + r.amount.toFixed(2) : '—'}</div>
    </label>
  `).join('');

  // Toggle selection
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      foundEmailReceipts[idx].selected = e.target.checked;
    });
  });
}

$('#importAllBtn').addEventListener('click', () => {
  foundEmailReceipts.forEach(r => r.selected = true);
  importSelectedReceipts();
});

$('#importSelectedBtn').addEventListener('click', () => {
  importSelectedReceipts();
});

function importSelectedReceipts() {
  const toImport = foundEmailReceipts.filter(r => r.selected);
  if (toImport.length === 0) {
    alert('No receipts selected.');
    return;
  }

  let imported = 0;
  toImport.forEach(r => {
    // Skip if already imported (by emailId)
    const exists = receipts.some(existing => existing.notes && existing.notes.includes(r.emailId));
    if (!exists) {
      receipts.push({
        id: generateId(),
        store: r.store,
        amount: r.amount,
        date: r.date,
        category: r.category,
        notes: r.notes,
        image: null,
      });
      imported++;
    }
  });

  saveReceipts(receipts);
  render();
  $('#addModal').classList.add('hidden');
  alert(`Imported ${imported} receipt${imported !== 1 ? 's' : ''}!`);
}

import { store } from './store.js';
import { api } from './api.js';
import { TrackerController } from './tracker.js';
import { ScannerController } from './scanner.js';
import { InactivityManager } from './inactivityManager.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Initialize Controllers
  const tracker = new TrackerController(showToast);
  const scanner = new ScannerController(showToast);

  // Authentication UI Elements
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.getElementById('app');
  const authForm = document.getElementById('auth-form');
  const authUsernameInput = document.getElementById('auth-username');
  const authPasswordInput = document.getElementById('auth-password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const loginTitle = document.getElementById('login-title');
  const loginSubtitle = document.getElementById('login-subtitle');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const loginErrorAlert = document.getElementById('login-error-alert');
  const btnFillDemo = document.getElementById('btn-fill-demo');

  // Sidebar User & Status Elements
  const userAvatar = document.getElementById('user-avatar');
  const userDisplayName = document.getElementById('user-display-name');
  const btnLogout = document.getElementById('btn-logout');
  const mongoStatusPill = document.getElementById('mongo-status-pill');
  const mongoStatusText = document.getElementById('mongo-status-text');

  // Storage Warning Banner Elements
  const storageWarningBanner = document.getElementById('storage-warning-banner');
  const storageBarFill = document.getElementById('storage-bar-fill');
  const storageWarningLabel = document.getElementById('storage-warning-label');
  const storageWarningDetail = document.getElementById('storage-warning-detail');
  const storageExportBtn = document.getElementById('storage-export-btn');

  let isRegisterMode = false;

  // Password Visibility Toggle
  btnTogglePassword?.addEventListener('click', () => {
    const isPass = authPasswordInput.type === 'password';
    authPasswordInput.type = isPass ? 'text' : 'password';
    btnTogglePassword.textContent = isPass ? 'Hide' : 'Show';
  });

  // Toggle Login vs Register Mode
  authToggleBtn?.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    if (loginErrorAlert) loginErrorAlert.style.display = 'none';

    if (isRegisterMode) {
      loginTitle.textContent = 'Create New DTS Account';
      loginSubtitle.textContent = 'Register username and password for document access';
      authSubmitBtn.textContent = 'Register Account';
      authToggleText.textContent = 'Already have an account?';
      authToggleBtn.textContent = 'Sign In';
    } else {
      loginTitle.textContent = 'DTS Outgoing Login';
      loginSubtitle.textContent = 'Sign in to record, track, and generate document reports';
      authSubmitBtn.textContent = 'Sign In';
      authToggleText.textContent = "Don't have an account?";
      authToggleBtn.textContent = 'Register New Account';
    }
  });

  // Demo Credentials Button
  btnFillDemo?.addEventListener('click', () => {
    if (authUsernameInput) authUsernameInput.value = 'admin';
    if (authPasswordInput) authPasswordInput.value = 'admin123';
  });

  // Authenticate User Handler
  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!username || !password) {
      showLoginError('Please provide both username and password.');
      return;
    }

    try {
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = 'Authenticating...';

      let userObj = null;

      if (store.isServerOnline) {
        if (isRegisterMode) {
          const res = await api.register(username, password);
          userObj = res.user;
          showToast(`Account registered successfully as @${userObj.username}!`, 'success');
        } else {
          const res = await api.login(username, password);
          userObj = res.user;
          showToast(`Welcome back, @${userObj.username}!`, 'success');
        }
      } else {
        // Offline / LocalStorage Mode
        userObj = { username, role: 'admin', mode: 'local' };
        showToast(`Signed in as @${username} (Local Session Mode)`, 'info');
      }

      store.saveUser(userObj);
      await store.syncDocuments();
      clearAuthInputs();
      showAppScreen(userObj);
    } catch (err) {
      showLoginError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isRegisterMode ? 'Register Account' : 'Sign In';
    }
  });

  function showLoginError(msg) {
    if (loginErrorAlert) {
      loginErrorAlert.textContent = msg;
      loginErrorAlert.style.display = 'block';
    }
  }

  function clearAuthInputs() {
    if (authUsernameInput) authUsernameInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
    if (authPasswordInput) authPasswordInput.type = 'password';
    if (btnTogglePassword) btnTogglePassword.textContent = 'Show';
    if (loginErrorAlert) {
      loginErrorAlert.textContent = '';
      loginErrorAlert.style.display = 'none';
    }
  }

  // Inactivity Warning Modal Elements & Controller
  const inactivityModal = document.getElementById('inactivity-modal');
  const inactivityTimerText = document.getElementById('inactivity-countdown-timer');
  const btnStayLoggedIn = document.getElementById('btn-stay-logged-in');
  const btnInactivityLogout = document.getElementById('btn-inactivity-logout');

  const inactivityManager = new InactivityManager({
    onWarning: (remainingSeconds) => {
      if (inactivityModal) {
        inactivityModal.classList.add('modal-open');
      }
      if (inactivityTimerText) {
        inactivityTimerText.textContent = String(remainingSeconds);
      }
    },
    onTimeout: () => {
      if (inactivityModal) {
        inactivityModal.classList.remove('modal-open');
      }
      store.logout();
      clearAuthInputs();
      showToast('⚠️ Automatically logged out due to 1 hour of inactivity.', 'warning');
      showLoginScreen();
    },
    onActivityReset: () => {
      if (inactivityModal) {
        inactivityModal.classList.remove('modal-open');
      }
    }
  });

  btnStayLoggedIn?.addEventListener('click', () => {
    inactivityManager.resetTimer();
    if (inactivityModal) {
      inactivityModal.classList.remove('modal-open');
    }
    showToast('Session extended.', 'info');
  });

  btnInactivityLogout?.addEventListener('click', () => {
    inactivityManager.stop();
    if (inactivityModal) {
      inactivityModal.classList.remove('modal-open');
    }
    store.logout();
    clearAuthInputs();
    showToast('Signed out successfully', 'info');
    showLoginScreen();
  });

  // Logout Handler
  btnLogout?.addEventListener('click', () => {
    inactivityManager.stop();
    if (inactivityModal) {
      inactivityModal.classList.remove('modal-open');
    }
    store.logout();
    clearAuthInputs();
    showToast('Signed out successfully', 'info');
    showLoginScreen();
  });

  function showLoginScreen() {
    inactivityManager.stop();
    clearAuthInputs();
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    tracker.render();
  }

  async function showAppScreen(user) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';

    if (userDisplayName) userDisplayName.textContent = user.username;
    if (userAvatar) userAvatar.textContent = user.username.charAt(0).toUpperCase();

    updateMongoStatusUI();
    await store.syncDocuments();
    await store.syncScannedDocuments();
    renderUserOfficeDatalist();
    tracker.render();
    scanner.render();

    // Start 1-Hour Inactivity Monitoring
    inactivityManager.start();
  }

  // Dynamic Per-User Office Datalist Renderer
  function renderUserOfficeDatalist() {
    const datalist = document.getElementById('user-office-list');
    if (!datalist) return;
    const offices = store.getUserOffices();
    datalist.innerHTML = offices.map(o => `<option value="${escapeHtml(o)}"></option>`).join('');
  }

  // Manage Offices Modal Controllers & Renderer
  const manageOfficesModal = document.getElementById('manage-offices-modal');
  const closeManageOfficesBtn = document.getElementById('manage-offices-modal-close');
  const doneManageOfficesBtn = document.getElementById('manage-offices-done-btn');
  const openManageOfficesBtns = document.querySelectorAll('.btn-open-manage-offices');
  const addOfficeForm = document.getElementById('add-office-form');
  const newOfficeInput = document.getElementById('new-office-input');
  const userOfficesListContainer = document.getElementById('user-offices-list');

  function openManageOfficesModal() {
    if (manageOfficesModal) {
      renderUserOfficesModalList();
      manageOfficesModal.classList.add('modal-open');
    }
  }

  function closeManageOfficesModal() {
    if (manageOfficesModal) {
      manageOfficesModal.classList.remove('modal-open');
      renderUserOfficeDatalist();
    }
  }

  openManageOfficesBtns.forEach(btn => {
    btn.addEventListener('click', () => openManageOfficesModal());
  });

  closeManageOfficesBtn?.addEventListener('click', () => closeManageOfficesModal());
  doneManageOfficesBtn?.addEventListener('click', () => closeManageOfficesModal());

  addOfficeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!newOfficeInput) return;
    const val = newOfficeInput.value.trim();
    if (!val) return;
    await store.addUserOffice(val);
    newOfficeInput.value = '';
    showToast(`Added "${val}" to your office dropdown options!`, 'success');
    renderUserOfficesModalList();
    renderUserOfficeDatalist();
  });

  function renderUserOfficesModalList() {
    if (!userOfficesListContainer) return;
    const offices = store.getUserOffices();

    if (offices.length === 0) {
      userOfficesListContainer.innerHTML = `
        <div class="user-offices-empty">
          <p>No saved office options yet.</p>
          <p style="font-size: 0.8rem; margin-top: 4px; color: var(--text-muted);">
            Type a new office above or submit documents to automatically build your custom list.
          </p>
        </div>
      `;
      return;
    }

    userOfficesListContainer.innerHTML = offices.map(o => `
      <div class="user-office-item-row" data-name="${escapeHtml(o)}">
        <span class="user-office-item-name">${escapeHtml(o)}</span>
        <div class="user-office-item-actions">
          <button type="button" class="btn-action edit-office-btn" title="Edit Office Name">
            ✏️ Edit
          </button>
          <button type="button" class="btn-action delete-btn del-office-btn" title="Remove Office Option">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

    userOfficesListContainer.querySelectorAll('.edit-office-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.user-office-item-row');
        const oldName = row.getAttribute('data-name');
        const nameSpan = row.querySelector('.user-office-item-name');
        
        nameSpan.innerHTML = `<input type="text" class="user-office-edit-input" value="${escapeHtml(oldName)}" />`;
        const input = nameSpan.querySelector('input');
        input.focus();

        const saveEdit = async () => {
          const newName = input.value.trim();
          if (newName && newName !== oldName) {
            await store.updateUserOfficeName(oldName, newName);
            showToast(`Updated office name to "${newName}"`, 'info');
          }
          renderUserOfficesModalList();
          renderUserOfficeDatalist();
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            input.blur();
          }
        });
      });
    });

    userOfficesListContainer.querySelectorAll('.del-office-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('.user-office-item-row');
        const name = row.getAttribute('data-name');
        if (confirm(`Remove "${name}" from your personal office options?`)) {
          await store.removeUserOffice(name);
          showToast(`Removed "${name}" from dropdown options`, 'info');
          renderUserOfficesModalList();
          renderUserOfficeDatalist();
        }
      });
    });
  }

  // Forward Form Submission
  const forwardForm = document.getElementById('forward-document-form');
  forwardForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const record = {
      trackingNo: document.getElementById('forward-dts-no').value.trim() || 'NONE',
      fromOffice: document.getElementById('forward-from-office').value.trim(),
      details: document.getElementById('forward-details').value.trim(),
      receivedBy: document.getElementById('forward-received-by').value.trim(),
      toOffice: document.getElementById('forward-to-office').value.trim(),
      date: document.getElementById('forward-date').value,
      type: 'forward'
    };

    try {
      await store.addDocument(record);
      // Auto-save typed office names to user's personal office list
      if (record.fromOffice) await store.addUserOffice(record.fromOffice);
      if (record.toOffice) await store.addUserOffice(record.toOffice);
      renderUserOfficeDatalist();

      showToast('Forwarded document record saved successfully to MongoDB!', 'success');
      forwardForm.reset();
      if (forwardDateInput) forwardDateInput.value = todayStr;
      switchView('track-view');
    } catch (err) {
      showToast(err.message || 'Failed to save document record.', 'error');
    }
  });

  // Receive Form Submission
  const receiveForm = document.getElementById('receive-document-form');
  receiveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const record = {
      trackingNo: 'NONE',
      fromOffice: document.getElementById('receive-from-office').value.trim(),
      details: document.getElementById('receive-details').value.trim(),
      receivedBy: document.getElementById('receive-received-by').value.trim(),
      toOffice: '',
      date: document.getElementById('receive-date').value,
      type: 'receive'
    };

    try {
      await store.addDocument(record);
      // Auto-save typed office name to user's personal office list
      if (record.fromOffice) await store.addUserOffice(record.fromOffice);
      renderUserOfficeDatalist();

      showToast('Received document record saved successfully to MongoDB!', 'success');
      receiveForm.reset();
      if (receiveDateInput) receiveDateInput.value = todayStr;
      switchView('track-view');
    } catch (err) {
      showToast(err.message || 'Failed to save document record.', 'error');
    }
  });

  function updateMongoStatusUI() {
    if (!mongoStatusPill || !mongoStatusText) return;
    if (store.isMongoConnected) {
      mongoStatusPill.className = 'mongo-status-pill mongo-online';
      mongoStatusText.textContent = 'MongoDB Cloud Connected';
    } else if (store.isServerOnline) {
      mongoStatusPill.className = 'mongo-status-pill mongo-offline';
      mongoStatusText.textContent = 'Express API Connected (Mongo Offline)';
    } else {
      mongoStatusPill.className = 'mongo-status-pill mongo-offline';
      mongoStatusText.textContent = 'Local Storage Fallback';
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function updateStorageWarningUI() {
    if (!storageWarningBanner || !store.isMongoConnected) {
      if (storageWarningBanner) storageWarningBanner.style.display = 'none';
      return;
    }

    const storage = await api.checkStorageUsage();
    if (!storage.available) {
      storageWarningBanner.style.display = 'none';
      return;
    }

    const { usedPercent, usedBytes, limitBytes } = storage;
    const usedMB = formatBytes(usedBytes);
    const limitMB = formatBytes(limitBytes);

    // Show banner only when 75% or above
    if (usedPercent >= 75) {
      storageWarningBanner.style.display = 'block';
      storageBarFill.style.width = `${usedPercent}%`;

      const isCritical = usedPercent >= 90;
      storageWarningBanner.classList.toggle('storage-critical', isCritical);

      if (isCritical) {
        storageWarningLabel.textContent = '🔴 Storage Critical!';
        storageWarningDetail.textContent = `MongoDB is at ${usedPercent}% capacity (${usedMB} / ${limitMB}). Export data immediately to prevent data loss.`;
      } else {
        storageWarningLabel.textContent = '⚠️ Storage Nearly Full';
        storageWarningDetail.textContent = `MongoDB is at ${usedPercent}% capacity (${usedMB} / ${limitMB}). Export and free up space soon.`;
      }
    } else {
      storageWarningBanner.style.display = 'none';
    }
  }

  // Wire storage export button to export all user documents as CSV
  storageExportBtn?.addEventListener('click', () => {
    const docs = store.getDocuments();
    if (docs.length === 0) {
      showToast('No documents to export.', 'info');
      return;
    }
    // Use tracker's export logic via a synthetic export event
    const exportBtnEl = document.getElementById('export-btn');
    if (exportBtnEl) {
      exportBtnEl.click();
      showToast(`✅ Exported ${docs.length} document(s) as CSV. You can now delete old records to free MongoDB space.`, 'success');
    }
  });

  async function performRealtimeCheck() {
    const res = await store.checkBackendStatus();
    updateMongoStatusUI();

    if (res.syncedCount && res.syncedCount > 0) {
      showToast(`⚡ MongoDB Connected! Synced ${res.syncedCount} temporary offline record(s) to cloud database in real-time.`, 'success');
      tracker.render();
    } else if (res.statusChanged) {
      if (store.isMongoConnected) {
        showToast('🟢 Connected to MongoDB Cloud Database (Real-time)', 'success');
        updateStorageWarningUI();
      } else {
        showToast('🟡 MongoDB disconnected. Switched to Temporary Local Browser Storage.', 'warning');
      }
      tracker.render();
    }
  }

  // Initialize Session & Start Realtime Polling
  await store.initStore();
  updateMongoStatusUI();
  await updateStorageWarningUI();

  // Background 3-second polling for Realtime Status Pill
  setInterval(performRealtimeCheck, 3000);
  // Storage check every 30 seconds (less frequent — it's a heavy call)
  setInterval(updateStorageWarningUI, 30000);
  window.addEventListener('online', performRealtimeCheck);
  window.addEventListener('focus', performRealtimeCheck);

  if (store.currentUser) {
    await showAppScreen(store.currentUser);
  } else {
    showLoginScreen();
  }

  // Navigation Router
  const navBtns = document.querySelectorAll('.nav-btn');
  const viewSections = document.querySelectorAll('.view-section');

  async function switchView(viewId) {
    navBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-view') === viewId;
      btn.classList.toggle('active', isTarget);
    });

    viewSections.forEach(section => {
      const isTarget = section.id === viewId;
      section.classList.toggle('active', isTarget);
    });

    if (viewId === 'track-view') {
      // Sync scanned docs first so linked document state is always fresh
      await store.syncScannedDocuments();
      tracker.render();
    } else if (viewId === 'scanner-view') {
      scanner.render();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // Global listener to navigate to scanner view and select linked document
  window.addEventListener('dts:view-scanned-doc', (e) => {
    const { scannedDocId } = e.detail || {};
    if (scannedDocId) {
      switchView('scanner-view');
      scanner.selectAndPreviewDocument(scannedDocId);
    }
  });

  // Theme Toggler
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeText = document.getElementById('theme-btn-text');
  const iconSun = document.getElementById('theme-icon-sun');
  const iconMoon = document.getElementById('theme-icon-moon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    store.setTheme(theme);

    if (theme === 'light') {
      if (themeText) themeText.textContent = 'Dark Mode';
      if (iconSun) iconSun.style.display = 'inline-block';
      if (iconMoon) iconMoon.style.display = 'none';
    } else {
      if (themeText) themeText.textContent = 'Light Mode';
      if (iconSun) iconSun.style.display = 'none';
      if (iconMoon) iconMoon.style.display = 'inline-block';
    }
  }

  applyTheme(store.getTheme());

  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  });

  // Default Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const forwardDateInput = document.getElementById('forward-date');
  const receiveDateInput = document.getElementById('receive-date');
  if (forwardDateInput) forwardDateInput.value = todayStr;
  if (receiveDateInput) receiveDateInput.value = todayStr;

  // Auto-Generate DTS Tracking No Button
  const generateDtsBtn = document.getElementById('btn-generate-dts');
  const forwardDtsInput = document.getElementById('forward-dts-no');

  generateDtsBtn?.addEventListener('click', () => {
    const generatedNo = store.generateTrackingNo();
    if (forwardDtsInput) {
      forwardDtsInput.value = generatedNo;
      showToast(`Generated DTS Tracking No: ${generatedNo}`, 'info');
    }
  });

  // (Form submissions handled in office management section above)
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

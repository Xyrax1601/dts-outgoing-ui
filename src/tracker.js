// Tracker View Controller & Data Table Manager

import { store } from './store.js';
import { buildPrintableHtml, exportToCSV, parseCSV } from './generator.js';

export class TrackerController {
  constructor(showToastCallback) {
    this.showToast = showToastCallback;
    this.selectedIds = new Set();
    this.currentViewMode = 'all'; // 'all', 'forward', 'receive'
    this.searchQuery = '';
    this.dateFilter = '';
    this.editingDocId = null;
    this.pendingImportDocs = [];

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.searchInput = document.getElementById('search-input');
    this.dateInput = document.getElementById('date-filter-input');
    this.clearBtn = document.getElementById('clear-filter-btn');
    this.toggleModeBtn = document.getElementById('toggle-view-mode-btn');
    this.printBtn = document.getElementById('print-selected-btn');
    this.exportBtn = document.getElementById('export-btn');
    
    // Import Modal elements
    this.openImportModalBtn = document.getElementById('open-import-modal-btn');
    this.importModal = document.getElementById('import-csv-modal');
    this.closeImportModalBtn = document.getElementById('close-import-modal');
    this.cancelImportBtn = document.getElementById('cancel-import-btn');
    this.loadPresetCsvBtn = document.getElementById('load-preset-csv-btn');
    this.dropZone = document.getElementById('drop-zone');
    this.modalCsvFileInput = document.getElementById('modal-csv-file-input');
    this.confirmImportBtn = document.getElementById('confirm-import-btn');
    this.previewContainer = document.getElementById('import-preview-container');
    this.previewTitle = document.getElementById('import-preview-title');
    this.previewTbody = document.getElementById('import-preview-tbody');

    this.deleteSelectedBtn = document.getElementById('delete-selected-btn');
    this.selectAllCheckbox = document.getElementById('select-all-checkbox');
    this.tableBody = document.getElementById('document-table-body');
    this.emptyState = document.getElementById('table-empty-state');
    
    // Stats elements
    this.statTotal = document.getElementById('stat-total-count');
    this.statForwarded = document.getElementById('stat-forwarded-count');
    this.statReceived = document.getElementById('stat-received-count');
    this.statSelected = document.getElementById('stat-selected-count');

    // Edit Modal
    this.editModal = document.getElementById('edit-modal');
    this.editForm = document.getElementById('edit-document-form');
    this.closeEditModalBtn = document.getElementById('close-edit-modal');
    this.cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    // Print Modal
    this.printPreviewModal = document.getElementById('print-preview-modal');
    this.printPreviewContent = document.getElementById('print-preview-content');
    this.closePrintPreviewBtn = document.getElementById('close-print-preview');
    this.triggerPrintBtn = document.getElementById('trigger-print-btn');
    this.printLimitSelect = document.getElementById('print-limit-select');
    this.printOrientationSelect = document.getElementById('print-orientation-select');
  }

  bindEvents() {
    // Search & Date Filter
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    this.dateInput?.addEventListener('change', (e) => {
      this.dateFilter = e.target.value;
      this.render();
    });

    this.clearBtn?.addEventListener('click', () => {
      if (this.searchInput) this.searchInput.value = '';
      if (this.dateInput) this.dateInput.value = '';
      this.searchQuery = '';
      this.dateFilter = '';
      this.render();
    });

    // View Mode Toggle
    this.toggleModeBtn?.addEventListener('click', () => {
      if (this.currentViewMode === 'all') {
        this.currentViewMode = 'receive';
        this.toggleModeBtn.textContent = 'View Forwarded Documents';
        this.toggleModeBtn.classList.remove('btn-secondary');
        this.toggleModeBtn.classList.add('btn-info');
      } else if (this.currentViewMode === 'receive') {
        this.currentViewMode = 'forward';
        this.toggleModeBtn.textContent = 'View All Documents';
        this.toggleModeBtn.classList.remove('btn-info');
        this.toggleModeBtn.classList.add('btn-accent');
      } else {
        this.currentViewMode = 'all';
        this.toggleModeBtn.textContent = 'View Received Documents';
        this.toggleModeBtn.classList.remove('btn-accent');
        this.toggleModeBtn.classList.add('btn-secondary');
      }
      this.render();
    });

    // Select All Checkbox
    this.selectAllCheckbox?.addEventListener('change', (e) => {
      const visibleDocs = this.getFilteredDocuments();
      if (e.target.checked) {
        visibleDocs.forEach(doc => this.selectedIds.add(doc.id));
      } else {
        visibleDocs.forEach(doc => this.selectedIds.delete(doc.id));
      }
      this.updateSelectionUI();
      this.renderTableRows(visibleDocs);
    });

    // Action buttons
    this.printBtn?.addEventListener('click', () => this.openPrintPreview());
    this.exportBtn?.addEventListener('click', () => this.handleExport());
    this.deleteSelectedBtn?.addEventListener('click', () => this.handleDeleteSelected());

    // Organised Import Modal Events
    this.openImportModalBtn?.addEventListener('click', () => this.openImportModal());
    this.closeImportModalBtn?.addEventListener('click', () => this.closeImportModal());
    this.cancelImportBtn?.addEventListener('click', () => this.closeImportModal());
    
    // Preset CSV import
    this.loadPresetCsvBtn?.addEventListener('click', () => {
      const count = store.loadSampleAssetCSV();
      this.showToast(`Successfully loaded ${count} records from documents_forward_2026-07-27.csv!`, 'success');
      this.closeImportModal();
      this.render();
    });

    // Custom File Drag & Drop + Browse
    this.dropZone?.addEventListener('click', () => this.modalCsvFileInput?.click());
    this.dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone?.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        this.handleFileSelected(files[0]);
      }
    });

    this.modalCsvFileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    this.confirmImportBtn?.addEventListener('click', () => this.handleConfirmImport());

    // Edit Modal events
    this.closeEditModalBtn?.addEventListener('click', () => this.closeEditModal());
    this.cancelEditBtn?.addEventListener('click', () => this.closeEditModal());
    this.editForm?.addEventListener('submit', (e) => this.handleEditSubmit(e));

    // Print Modal events
    this.closePrintPreviewBtn?.addEventListener('click', () => this.closePrintPreview());
    this.triggerPrintBtn?.addEventListener('click', () => {
      window.print();
    });

    this.printLimitSelect?.addEventListener('change', () => this.openPrintPreview());
    this.printOrientationSelect?.addEventListener('change', () => this.openPrintPreview());
  }

  getFilteredDocuments() {
    let docs = store.getDocuments();

    if (this.currentViewMode === 'forward') {
      docs = docs.filter(d => d.type === 'forward');
    } else if (this.currentViewMode === 'receive') {
      docs = docs.filter(d => d.type === 'receive' || (d.receivedBy && d.receivedBy.trim() !== ''));
    }

    if (this.searchQuery) {
      docs = docs.filter(d => {
        const tracking = (d.trackingNo || '').toLowerCase();
        const from = (d.fromOffice || '').toLowerCase();
        const details = (d.details || '').toLowerCase();
        const receiver = (d.receivedBy || '').toLowerCase();
        const to = (d.toOffice || '').toLowerCase();
        return tracking.includes(this.searchQuery) ||
               from.includes(this.searchQuery) ||
               details.includes(this.searchQuery) ||
               receiver.includes(this.searchQuery) ||
               to.includes(this.searchQuery);
      });
    }

    if (this.dateFilter) {
      docs = docs.filter(d => d.date === this.dateFilter);
    }

    return docs;
  }

  render() {
    const allDocs = store.getDocuments();
    const visibleDocs = this.getFilteredDocuments();

    if (this.statTotal) this.statTotal.textContent = allDocs.length;
    if (this.statForwarded) this.statForwarded.textContent = allDocs.filter(d => d.type === 'forward').length;
    if (this.statReceived) this.statReceived.textContent = allDocs.filter(d => d.type === 'receive' || d.receivedBy).length;
    
    this.updateSelectionUI();
    this.renderTableRows(visibleDocs);
  }

  updateSelectionUI() {
    if (this.statSelected) this.statSelected.textContent = this.selectedIds.size;
    if (this.deleteSelectedBtn) {
      if (this.selectedIds.size > 0) {
        this.deleteSelectedBtn.removeAttribute('disabled');
        this.deleteSelectedBtn.classList.add('active-danger');
      } else {
        this.deleteSelectedBtn.setAttribute('disabled', 'true');
        this.deleteSelectedBtn.classList.remove('active-danger');
      }
    }
  }

  renderTableRows(docs) {
    if (!this.tableBody) return;

    if (docs.length === 0) {
      this.tableBody.innerHTML = '';
      if (this.emptyState) this.emptyState.style.display = 'flex';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';

    const allVisibleSelected = docs.length > 0 && docs.every(d => this.selectedIds.has(d.id));
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.checked = allVisibleSelected;
    }

    this.tableBody.innerHTML = docs.map(doc => {
      const isChecked = this.selectedIds.has(doc.id);
      const formattedDetails = (doc.details || '').replace(/\n/g, '<br>');
      const isNone = (doc.trackingNo || '').toUpperCase() === 'NONE';
      const kindLabel = doc.type === 'receive' ? 'Receive' : 'Forward';

      return `
        <tr data-id="${doc.id}" class="${isChecked ? 'row-selected' : ''}">
          <td class="col-checkbox">
            <input type="checkbox" class="row-checkbox" data-id="${doc.id}" ${isChecked ? 'checked' : ''}>
          </td>
          <td class="col-tracking">
            <span class="tracking-badge ${isNone ? 'tracking-none' : ''}">
              ${escapeHtml(doc.trackingNo || 'NONE')}
            </span>
          </td>
          <td class="col-from">${escapeHtml(doc.fromOffice || '-')}</td>
          <td class="col-details-cell">
            <div class="details-content">${formattedDetails}</div>
          </td>
          <td class="col-received">${escapeHtml(doc.receivedBy || '-')}</td>
          <td class="col-to">${escapeHtml(doc.toOffice || '-')}</td>
          <td class="col-date">${escapeHtml(doc.date || '-')}</td>
          <td class="col-actions">
            <div class="action-cell-container">
              <span class="kind-badge kind-${doc.type === 'receive' ? 'receive' : 'forward'}">
                ${kindLabel}
              </span>
              <div class="action-btn-group">
                <button class="btn-action edit-btn" data-id="${doc.id}" title="Edit Record">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>Edit</span>
                </button>
                <button class="btn-action delete-btn" data-id="${doc.id}" title="Delete Record">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.tableBody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedIds.add(id);
        } else {
          this.selectedIds.delete(id);
        }
        this.updateSelectionUI();
        const tr = e.target.closest('tr');
        if (tr) tr.classList.toggle('row-selected', e.target.checked);
      });
    });

    this.tableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openEditModal(id);
      });
    });

    this.tableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.handleDeleteSingle(id);
      });
    });
  }

  // Import Modal Logic
  openImportModal() {
    this.pendingImportDocs = [];
    if (this.previewContainer) this.previewContainer.style.display = 'none';
    if (this.confirmImportBtn) this.confirmImportBtn.setAttribute('disabled', 'true');
    if (this.importModal) this.importModal.classList.add('modal-open');
  }

  closeImportModal() {
    this.pendingImportDocs = [];
    if (this.importModal) this.importModal.classList.remove('modal-open');
  }

  handleFileSelected(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCSV(event.target.result);
        if (!parsed || parsed.length === 0) {
          this.showToast('No valid document records found in CSV file.', 'error');
          return;
        }

        this.pendingImportDocs = parsed;
        this.renderImportPreview(parsed, file.name);
      } catch (err) {
        console.error(err);
        this.showToast('Failed to parse CSV file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  renderImportPreview(docs, fileName) {
    if (this.previewContainer) this.previewContainer.style.display = 'flex';
    if (this.previewTitle) this.previewTitle.textContent = `Import Preview from ${fileName} (${docs.length} records ready)`;

    if (this.previewTbody) {
      const previewRows = docs.slice(0, 5).map(d => `
        <tr>
          <td><span class="tracking-badge">${escapeHtml(d.trackingNo || 'NONE')}</span></td>
          <td>${escapeHtml(d.fromOffice || '-')}</td>
          <td>${escapeHtml((d.details || '').substring(0, 60))}...</td>
          <td>${escapeHtml(d.toOffice || '-')}</td>
          <td>${escapeHtml(d.date || '-')}</td>
          <td><span class="kind-badge kind-${d.type === 'receive' ? 'receive' : 'forward'}">${d.type === 'receive' ? 'Receive' : 'Forward'}</span></td>
        </tr>
      `).join('');

      this.previewTbody.innerHTML = previewRows + (docs.length > 5 ? `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">... and ${docs.length - 5} more records</td></tr>` : '');
    }

    if (this.confirmImportBtn) {
      this.confirmImportBtn.removeAttribute('disabled');
    }
  }

  async handleConfirmImport() {
    if (!this.pendingImportDocs || this.pendingImportDocs.length === 0) return;

    const modeRadios = document.getElementsByName('import-mode');
    let mode = 'replace';
    for (const r of modeRadios) {
      if (r.checked) mode = r.value;
    }

    try {
      if (mode === 'replace') {
        await store.saveDocuments(this.pendingImportDocs);
        this.showToast(`Replaced current dataset with ${this.pendingImportDocs.length} imported records!`, 'success');
      } else {
        for (const d of this.pendingImportDocs) {
          await store.addDocument(d);
        }
        this.showToast(`Appended ${this.pendingImportDocs.length} imported records!`, 'success');
      }
      this.closeImportModal();
      this.render();
    } catch (err) {
      this.showToast(err.message || 'Import failed.', 'error');
    }
  }

  async handleDeleteSingle(id) {
    const doc = store.getDocumentById(id);
    if (!doc) return;
    if (confirm(`Are you sure you want to delete record "${doc.trackingNo !== 'NONE' ? doc.trackingNo : doc.fromOffice}"?`)) {
      try {
        await store.deleteDocument(id);
        this.selectedIds.delete(id);
        this.showToast('Document deleted successfully', 'success');
        this.render();
      } catch (err) {
        this.showToast(err.message || 'Failed to delete document.', 'error');
      }
    }
  }

  async handleDeleteSelected() {
    if (this.selectedIds.size === 0) return;
    const count = this.selectedIds.size;
    if (confirm(`Are you sure you want to delete ${count} selected document(s)?`)) {
      try {
        await store.deleteBatch(Array.from(this.selectedIds));
        this.selectedIds.clear();
        this.showToast(`${count} document(s) deleted successfully`, 'success');
        this.render();
      } catch (err) {
        this.showToast(err.message || 'Failed to delete selected documents.', 'error');
      }
    }
  }

  openEditModal(id) {
    const doc = store.getDocumentById(id);
    if (!doc) return;
    this.editingDocId = id;

    document.getElementById('edit-tracking-no').value = doc.trackingNo || '';
    document.getElementById('edit-from-office').value = doc.fromOffice || '';
    document.getElementById('edit-details').value = doc.details || '';
    document.getElementById('edit-received-by').value = doc.receivedBy || '';
    document.getElementById('edit-to-office').value = doc.toOffice || '';
    document.getElementById('edit-date').value = doc.date || '';

    if (this.editModal) {
      this.editModal.classList.add('modal-open');
    }
  }

  closeEditModal() {
    this.editingDocId = null;
    if (this.editModal) {
      this.editModal.classList.remove('modal-open');
    }
  }

  async handleEditSubmit(e) {
    e.preventDefault();
    if (!this.editingDocId) return;

    const updated = {
      trackingNo: document.getElementById('edit-tracking-no').value.trim() || 'NONE',
      fromOffice: document.getElementById('edit-from-office').value.trim(),
      details: document.getElementById('edit-details').value.trim(),
      receivedBy: document.getElementById('edit-received-by').value.trim(),
      toOffice: document.getElementById('edit-to-office').value.trim(),
      date: document.getElementById('edit-date').value
    };

    try {
      await store.updateDocument(this.editingDocId, updated);
      this.closeEditModal();
      this.showToast('Document record updated successfully!', 'success');
      this.render();
    } catch (err) {
      this.showToast(err.message || 'Failed to update document record.', 'error');
    }
  }

  openPrintPreview() {
    const visibleDocs = this.getFilteredDocuments();
    let targetDocs = visibleDocs;
    let title = 'Forwarded Documents';

    if (this.selectedIds.size > 0) {
      targetDocs = visibleDocs.filter(d => this.selectedIds.has(d.id));
      title = 'Forwarded Documents — Selected';
    } else {
      title = 'Forwarded Documents — All Visible';
    }

    if (targetDocs.length === 0) {
      this.showToast('No documents available to generate or print.', 'warning');
      return;
    }

    const maxRowsVal = parseInt(this.printLimitSelect ? this.printLimitSelect.value : '30', 10);
    const layoutModeVal = this.printOrientationSelect ? this.printOrientationSelect.value : 'portrait';

    const html = buildPrintableHtml(targetDocs, title, {
      maxRows: maxRowsVal,
      layoutMode: layoutModeVal
    });

    if (this.printPreviewContent) {
      this.printPreviewContent.innerHTML = html;
    }
    if (this.printPreviewModal) {
      this.printPreviewModal.classList.add('modal-open');
    }
  }

  closePrintPreview() {
    if (this.printPreviewModal) {
      this.printPreviewModal.classList.remove('modal-open');
    }
  }

  handleExport() {
    const visibleDocs = this.getFilteredDocuments();
    let targetDocs = visibleDocs;
    if (this.selectedIds.size > 0) {
      targetDocs = visibleDocs.filter(d => this.selectedIds.has(d.id));
    }
    exportToCSV(targetDocs, `documents_forward_${new Date().toISOString().split('T')[0]}.csv`);
    this.showToast(`Exported ${targetDocs.length} records to CSV`, 'info');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

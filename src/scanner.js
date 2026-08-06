import { store } from './store.js';

export class ScannerController {
  constructor(showToastFn) {
    this.showToast = showToastFn || console.log;
    this.selectedDocId = null;
    this.selectedDocIds = new Set();
    this.currentDocZoom = 1.0;
    this.currentDocRotation = 0;
    this.activePreviewPageIndex = 0;

    // Scanner Modal State
    this.capturedPages = []; // Array of base64 data URLs
    this.cameraStream = null;
    this.activeFilter = 'none'; // 'none', 'grayscale', 'contrast'

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Navigation & Add Document
    const btnAddDoc = document.getElementById('scanner-btn-add-doc');
    const datePicker = document.getElementById('scanner-date-filter');
    const selectAllCheckbox = document.getElementById('scanner-select-all');
    const btnBatchDelete = document.getElementById('scanner-btn-batch-delete');

    btnAddDoc?.addEventListener('click', () => this.openScannerModal());
    datePicker?.addEventListener('change', () => this.renderList());

    selectAllCheckbox?.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      this.selectedDocIds.clear();
      const checkboxes = document.querySelectorAll('.scanner-doc-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) this.selectedDocIds.add(cb.getAttribute('data-id'));
      });
      this.updateBatchActionsUI();
    });

    btnBatchDelete?.addEventListener('click', async () => {
      if (this.selectedDocIds.size === 0) return;
      if (!confirm(`Are you sure you want to delete ${this.selectedDocIds.size} selected scanned document(s)?`)) return;

      const ids = Array.from(this.selectedDocIds);
      await store.deleteBatchScannedDocuments(ids);
      this.selectedDocIds.clear();
      this.showToast(`Deleted ${ids.length} scanned document(s)`, 'success');
      this.render();
    });

    // Right Pane Preview Controls
    const btnZoomIn = document.getElementById('scanner-preview-zoomin');
    const btnZoomOut = document.getElementById('scanner-preview-zoomout');
    const btnRotate = document.getElementById('scanner-preview-rotate');
    const btnPrint = document.getElementById('scanner-preview-print');
    const btnDownload = document.getElementById('scanner-preview-download');
    const btnDelete = document.getElementById('scanner-preview-delete');
    const btnPrevPage = document.getElementById('scanner-prev-page');
    const btnNextPage = document.getElementById('scanner-next-page');

    btnZoomIn?.addEventListener('click', () => {
      this.currentDocZoom = Math.min(2.5, this.currentDocZoom + 0.2);
      this.applyPreviewTransform();
    });

    btnZoomOut?.addEventListener('click', () => {
      this.currentDocZoom = Math.max(0.5, this.currentDocZoom - 0.2);
      this.applyPreviewTransform();
    });

    btnRotate?.addEventListener('click', () => {
      this.currentDocRotation = (this.currentDocRotation + 90) % 360;
      this.applyPreviewTransform();
    });

    btnPrint?.addEventListener('click', () => this.printCurrentDocument());
    btnDownload?.addEventListener('click', () => this.downloadCurrentDocument());
    btnDelete?.addEventListener('click', async () => {
      if (!this.selectedDocId) return;
      if (!confirm('Are you sure you want to delete this scanned document?')) return;
      await store.deleteScannedDocument(this.selectedDocId);
      this.selectedDocId = null;
      this.showToast('Scanned document deleted', 'info');
      this.render();
    });

    btnPrevPage?.addEventListener('click', () => {
      if (this.activePreviewPageIndex > 0) {
        this.activePreviewPageIndex--;
        this.renderPreview();
      }
    });

    btnNextPage?.addEventListener('click', () => {
      const doc = store.scannedDocuments.find(d => d.id === this.selectedDocId);
      if (doc && this.activePreviewPageIndex < doc.pages.length - 1) {
        this.activePreviewPageIndex++;
        this.renderPreview();
      }
    });

    // Scanner Modal Handlers
    const modalCloseBtn = document.getElementById('scanner-modal-close');
    const tabCamera = document.getElementById('scanner-tab-camera');
    const tabFlatbed = document.getElementById('scanner-tab-flatbed');
    const btnStartCam = document.getElementById('scanner-btn-start-camera');
    const btnCapturePage = document.getElementById('scanner-btn-capture');
    const btnRequestPrinter = document.getElementById('scanner-btn-request-printer');
    const fileInput = document.getElementById('scanner-file-input');
    const formSave = document.getElementById('scanner-modal-form');

    modalCloseBtn?.addEventListener('click', () => this.closeScannerModal());

    tabCamera?.addEventListener('click', () => this.switchModalTab('camera'));
    tabFlatbed?.addEventListener('click', () => this.switchModalTab('flatbed'));

    btnStartCam?.addEventListener('click', () => this.startCameraStream());
    btnCapturePage?.addEventListener('click', () => this.captureCameraFrame());

    btnRequestPrinter?.addEventListener('click', () => this.requestPrinterScannerAccess());
    fileInput?.addEventListener('change', (e) => this.handleScannerFilesSelect(e));

    formSave?.addEventListener('submit', (e) => this.handleSaveScannedDoc(e));

    // Filter selector for camera scan
    const filterBtns = document.querySelectorAll('.scanner-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.getAttribute('data-filter') || 'none';
        const video = document.getElementById('scanner-video-feed');
        if (video) {
          video.className = `scanner-video ${this.activeFilter}`;
        }
      });
    });
  }

  selectAndPreviewDocument(docId) {
    if (!docId) return;
    this.selectedDocId = docId;
    this.activePreviewPageIndex = 0;
    this.currentDocZoom = 1.0;
    this.currentDocRotation = 0;
    this.render();
  }

  async render() {
    const datePicker = document.getElementById('scanner-date-filter');
    const dateValue = datePicker ? datePicker.value : '';

    await store.syncScannedDocuments(dateValue);

    // If no selected document or current selected no longer exists, select first
    if (!this.selectedDocId || !store.scannedDocuments.some(d => d.id === this.selectedDocId)) {
      this.selectedDocId = store.scannedDocuments.length > 0 ? store.scannedDocuments[0].id : null;
      this.activePreviewPageIndex = 0;
      this.currentDocZoom = 1.0;
      this.currentDocRotation = 0;
    }

    this.renderList();
    this.renderPreview();
  }

  renderList() {
    const container = document.getElementById('scanner-doc-list');
    const selectAllCheckbox = document.getElementById('scanner-select-all');
    if (!container) return;

    const datePicker = document.getElementById('scanner-date-filter');
    const filterDate = datePicker ? datePicker.value : '';

    let docs = store.scannedDocuments;
    if (filterDate) {
      docs = docs.filter(d => d.date === filterDate);
    }

    if (docs.length === 0) {
      container.innerHTML = `
        <div class="scanner-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <p>No scanned documents found.</p>
          <button type="button" class="btn-primary btn-sm" onclick="document.getElementById('scanner-btn-add-doc').click()">+ Scan First Document</button>
        </div>
      `;
      if (selectAllCheckbox) selectAllCheckbox.checked = false;
      this.updateBatchActionsUI();
      return;
    }

    container.innerHTML = docs.map(doc => {
      const isSelected = doc.id === this.selectedDocId;
      const isChecked = this.selectedDocIds.has(doc.id);
      const pageCount = doc.pages ? doc.pages.length : 1;
      const sizeKb = doc.fileSize ? Math.round(doc.fileSize / 1024) + ' KB' : '~150 KB';
      const firstPageThumb = (doc.pages && doc.pages[0]) ? doc.pages[0] : '';

      return `
        <div class="scanner-list-item ${isSelected ? 'selected' : ''}" data-id="${doc.id}">
          <label class="scanner-item-checkbox-wrapper" onclick="event.stopPropagation()">
            <input type="checkbox" class="scanner-doc-checkbox" data-id="${doc.id}" ${isChecked ? 'checked' : ''}>
            <span class="custom-checkbox"></span>
          </label>

          <div class="scanner-item-content">
            <div class="scanner-item-title-row">
              <span class="scanner-item-title">${escapeHtml(doc.title)}</span>
              ${doc.trackingNo && doc.trackingNo !== 'NONE' ? `<span class="scanner-item-badge">${escapeHtml(doc.trackingNo)}</span>` : ''}
            </div>
            <div class="scanner-item-meta">
              <span>📅 ${escapeHtml(doc.date)}</span>
              <span>📄 ${pageCount} page${pageCount > 1 ? 's' : ''}</span>
              <span>💾 ${sizeKb}</span>
            </div>
          </div>

          <div class="scanner-item-thumb">
            ${firstPageThumb ? `<img src="${firstPageThumb}" alt="Thumbnail" />` : `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to row items
    const rows = container.querySelectorAll('.scanner-list-item');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('scanner-doc-checkbox') || e.target.closest('.scanner-item-checkbox-wrapper')) return;
        const id = row.getAttribute('data-id');
        this.selectedDocId = id;
        this.activePreviewPageIndex = 0;
        this.currentDocZoom = 1.0;
        this.currentDocRotation = 0;
        this.renderList();
        this.renderPreview();
      });
    });

    // Checkbox change listeners
    const checkboxes = container.querySelectorAll('.scanner-doc-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedDocIds.add(id);
        } else {
          this.selectedDocIds.delete(id);
        }
        this.updateBatchActionsUI();
      });
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.checked = docs.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    }

    this.updateBatchActionsUI();
  }

  updateBatchActionsUI() {
    const btnBatchDelete = document.getElementById('scanner-btn-batch-delete');
    const selectedCountSpan = document.getElementById('scanner-selected-count');

    if (btnBatchDelete) {
      btnBatchDelete.style.display = this.selectedDocIds.size > 0 ? 'inline-flex' : 'none';
    }
    if (selectedCountSpan) {
      selectedCountSpan.textContent = this.selectedDocIds.size > 0 ? `${this.selectedDocIds.size} Selected` : '';
    }
  }

  renderPreview() {
    const doc = store.scannedDocuments.find(d => d.id === this.selectedDocId);
    const titleHeader = document.getElementById('scanner-preview-title');
    const dateMeta = document.getElementById('scanner-preview-date');
    const trackingMeta = document.getElementById('scanner-preview-tracking');
    const paperContainer = document.getElementById('scanner-paper-sheet');
    const pageNavContainer = document.getElementById('scanner-page-nav');
    const pageIndicator = document.getElementById('scanner-page-indicator');

    if (!doc || !doc.pages || doc.pages.length === 0) {
      if (titleHeader) titleHeader.textContent = 'SCANNED DOCUMENT';
      if (dateMeta) dateMeta.textContent = '';
      if (trackingMeta) trackingMeta.textContent = '';
      if (pageNavContainer) pageNavContainer.style.display = 'none';
      if (paperContainer) {
        paperContainer.innerHTML = `
          <div class="scanner-paper-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <p>Select a scanned document from the list to view preview.</p>
          </div>
        `;
      }
      return;
    }

    if (titleHeader) titleHeader.textContent = doc.title.toUpperCase();
    if (dateMeta) dateMeta.textContent = `Date: ${doc.date}`;
    if (trackingMeta) trackingMeta.textContent = doc.trackingNo && doc.trackingNo !== 'NONE' ? `DTS No: ${doc.trackingNo}` : 'Unlinked Document';

    if (this.activePreviewPageIndex >= doc.pages.length) {
      this.activePreviewPageIndex = 0;
    }

    const currentImgUrl = doc.pages[this.activePreviewPageIndex];

    if (paperContainer) {
      paperContainer.innerHTML = `
        <div class="scanner-paper-document" id="scanner-paper-doc-img-wrapper">
          <img src="${currentImgUrl}" id="scanner-preview-image" alt="Scanned Document Page ${this.activePreviewPageIndex + 1}" />
        </div>
      `;
      this.applyPreviewTransform();
    }

    if (pageNavContainer) {
      if (doc.pages.length > 1) {
        pageNavContainer.style.display = 'flex';
        if (pageIndicator) pageIndicator.textContent = `Page ${this.activePreviewPageIndex + 1} of ${doc.pages.length}`;
      } else {
        pageNavContainer.style.display = 'none';
      }
    }
  }

  applyPreviewTransform() {
    const img = document.getElementById('scanner-preview-image');
    if (!img) return;
    img.style.transform = `scale(${this.currentDocZoom}) rotate(${this.currentDocRotation}deg)`;
    img.style.transition = 'transform 0.25s ease';
  }

  printCurrentDocument() {
    const doc = store.scannedDocuments.find(d => d.id === this.selectedDocId);
    if (!doc || !doc.pages || doc.pages.length === 0) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up blocked. Please allow pop-ups to print scanned document.');
      return;
    }

    const pagesHtml = doc.pages.map((p, i) => `
      <div style="page-break-after: always; text-align:center; padding: 20px;">
        <img src="${p}" style="max-width:100%; max-height:90vh; object-fit:contain; border:1px solid #ccc;" />
        <p style="font-family:sans-serif; font-size:12px; color:#666; margin-top:8px;">${escapeHtml(doc.title)} — Page ${i+1} of ${doc.pages.length}</p>
      </div>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Scanned Document - ${escapeHtml(doc.title)}</title>
        <style>
          body { margin: 0; padding: 0; background: #fff; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  downloadCurrentDocument() {
    const doc = store.scannedDocuments.find(d => d.id === this.selectedDocId);
    if (!doc || !doc.pages || doc.pages.length === 0) return;

    const currentImgUrl = doc.pages[this.activePreviewPageIndex];
    const a = document.createElement('a');
    a.href = currentImgUrl;
    a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_p${this.activePreviewPageIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast('Downloaded scanned page image', 'success');
  }

  // ─── SCANNER MODAL & LIVE CAMERA CONTROLLER ────────────────────────────

  openScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (!modal) return;

    this.capturedPages = [];
    this.activeFilter = 'none';

    // Reset modal form
    const form = document.getElementById('scanner-modal-form');
    if (form) form.reset();

    const titleInput = document.getElementById('scanner-doc-title');
    const dateInput = document.getElementById('scanner-doc-date');
    const trackingSelect = document.getElementById('scanner-doc-tracking');

    if (titleInput) titleInput.value = `Scanned_Doc_${new Date().toISOString().slice(0,10)}`;
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Populate Tracking No dropdown options
    if (trackingSelect) {
      trackingSelect.innerHTML = `<option value="NONE">-- Optional: Link to DTS Tracking No. --</option>` +
        store.documents.map(d => `<option value="${escapeHtml(d.trackingNo)}">${escapeHtml(d.trackingNo)} (${escapeHtml(d.details.slice(0, 30))})</option>`).join('');
    }

    this.renderCapturedPagesGallery();
    modal.style.display = 'flex';

    // Default to Camera mode on smartphones/tablets, Flatbed/File on PC
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    if (isMobile) {
      this.switchModalTab('camera');
      this.startCameraStream();
    } else {
      this.switchModalTab('flatbed');
    }
  }

  closeScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.style.display = 'none';
    this.stopCameraStream();
  }

  switchModalTab(tabName) {
    const tabCamera = document.getElementById('scanner-tab-camera');
    const tabFlatbed = document.getElementById('scanner-tab-flatbed');
    const contentCamera = document.getElementById('scanner-content-camera');
    const contentFlatbed = document.getElementById('scanner-content-flatbed');

    if (tabName === 'camera') {
      tabCamera?.classList.add('active');
      tabFlatbed?.classList.remove('active');
      if (contentCamera) contentCamera.style.display = 'block';
      if (contentFlatbed) contentFlatbed.style.display = 'none';
      this.startCameraStream();
    } else {
      tabFlatbed?.classList.add('active');
      tabCamera?.classList.remove('active');
      if (contentFlatbed) contentFlatbed.style.display = 'block';
      if (contentCamera) contentCamera.style.display = 'none';
      this.stopCameraStream();
    }
  }

  async startCameraStream() {
    const video = document.getElementById('scanner-video-feed');
    const placeholder = document.getElementById('scanner-video-placeholder');
    if (!video) return;

    try {
      this.stopCameraStream();

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Rear camera on phones
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.cameraStream;
      video.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      await video.play();
    } catch (err) {
      console.warn('Camera access error:', err);
      if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.querySelector('p').textContent = 'Camera access blocked or unavailable. Please use File/Scanner upload tab.';
      }
      if (video) video.style.display = 'none';
    }
  }

  stopCameraStream() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }

  async captureCameraFrame() {
    const video = document.getElementById('scanner-video-feed');
    if (!video || !this.cameraStream) {
      this.showToast('Camera is not active', 'error');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Apply document contrast/grayscale filter if selected
    if (this.activeFilter === 'grayscale') {
      ctx.filter = 'grayscale(100%) contrast(120%)';
    } else if (this.activeFilter === 'contrast') {
      ctx.filter = 'contrast(160%) brightness(105%) grayscale(80%)';
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.90);

    // Compress captured canvas image automatically
    try {
      const compressedDataUrl = await store.compressImage(rawDataUrl, 1600, 0.70);
      this.capturedPages.push(compressedDataUrl);
      this.renderCapturedPagesGallery();
      this.showToast(`Page ${this.capturedPages.length} captured & compressed`, 'success');
    } catch (e) {
      this.showToast('Failed to process captured image', 'error');
    }
  }

  async requestPrinterScannerAccess() {
    this.showToast('Scanning hardware request sent to device...', 'info');

    // Attempt browser Web API Device / ImageCapture request if available
    try {
      if ('mediaDevice' in navigator || (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        if (videoInputs.length > 0) {
          this.switchModalTab('camera');
          this.showToast(`Found ${videoInputs.length} camera/scanner input device(s)`, 'success');
          return;
        }
      }
    } catch (e) {
      console.log('Hardware search error:', e);
    }

    // Trigger file dialog as flatbed printer/scanner fallthrough
    const fileInput = document.getElementById('scanner-file-input');
    if (fileInput) fileInput.click();
  }

  async handleScannerFilesSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const compressed = await store.compressImage(file, 1600, 0.70);
        this.capturedPages.push(compressed);
      } catch (err) {
        console.error('Error processing file:', file.name, err);
        this.showToast(`Error processing file ${file.name}`, 'error');
      }
    }

    this.renderCapturedPagesGallery();
    this.showToast(`Added ${files.length} document page(s)`, 'success');
  }

  renderCapturedPagesGallery() {
    const gallery = document.getElementById('scanner-captured-gallery');
    const pageCountSpan = document.getElementById('scanner-captured-count');

    if (pageCountSpan) {
      pageCountSpan.textContent = `${this.capturedPages.length} page(s) ready`;
    }

    if (!gallery) return;

    if (this.capturedPages.length === 0) {
      gallery.innerHTML = `<p class="gallery-empty-msg">No pages scanned yet. Use camera capture or upload files above.</p>`;
      return;
    }

    gallery.innerHTML = this.capturedPages.map((pageDataUrl, index) => `
      <div class="captured-page-card">
        <img src="${pageDataUrl}" alt="Captured Page ${index + 1}" />
        <div class="page-card-overlay">
          <span>Page ${index + 1}</span>
          <button type="button" class="btn-del-page" data-index="${index}" title="Remove Page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    const deleteBtns = gallery.querySelectorAll('.btn-del-page');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        this.capturedPages.splice(idx, 1);
        this.renderCapturedPagesGallery();
      });
    });
  }

  async handleSaveScannedDoc(e) {
    e.preventDefault();

    if (this.capturedPages.length === 0) {
      this.showToast('Please capture or upload at least 1 document page', 'error');
      return;
    }

    const titleInput = document.getElementById('scanner-doc-title');
    const dateInput = document.getElementById('scanner-doc-date');
    const trackingSelect = document.getElementById('scanner-doc-tracking');
    const notesInput = document.getElementById('scanner-doc-notes');

    const title = titleInput ? titleInput.value.trim() : 'Scanned Document';
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    const trackingNo = trackingSelect ? trackingSelect.value : 'NONE';
    const notes = notesInput ? notesInput.value.trim() : '';

    const btnSubmit = document.getElementById('scanner-btn-save-doc');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Compressing & Saving...';
    }

    try {
      const created = await store.addScannedDocument({
        title,
        date,
        trackingNo,
        notes,
        pages: this.capturedPages
      });

      this.selectedDocId = created.id;
      this.closeScannerModal();
      this.showToast('Scanned document saved successfully to collection!', 'success');
      await this.render();
    } catch (err) {
      this.showToast(err.message || 'Failed to save scanned document', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Save Scanned Document';
      }
    }
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

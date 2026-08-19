import { createWorker } from 'tesseract.js';
import jsQR from 'jsqr';

let cachedWorker = null;

/**
 * Get or initialize singleton Tesseract worker
 */
async function getWorker(onProgress) {
  if (!cachedWorker) {
    cachedWorker = await createWorker('eng', 1, {
      logger: m => {
        if (onProgress && (m.status === 'recognizing text' || m.status === 'loading language traineddata')) {
          onProgress(Math.round((m.progress || 0) * 100), m.status);
        }
      }
    });
  }
  return cachedWorker;
}

/**
 * Pre-processes an image element or URL on canvas:
 * 1. Adds padding so text touching borders is preserved.
 * 2. Removes yellow highlights / borders (turning them to white).
 * 3. Removes red spellcheck squiggly lines so names are OCR'd cleanly.
 * 4. Removes blue annotation helper text so it doesn't corrupt extracted content.
 * 5. Binarizes & boosts contrast.
 */
export async function preprocessDtsCanvas(imageSource) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const padding = 50;
        const scale = 2.0;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((img.width + padding * 2) * scale);
        canvas.height = Math.round((img.height + padding * 2) * scale);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image scaled and centered
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, padding * scale, padding * scale, img.width * scale, img.height * scale);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Try QR code scan on the scaled raw frame before filter modification
        let qrResult = null;
        try {
          qrResult = jsQR(data, canvas.width, canvas.height);
        } catch (e) {
          // Ignore QR error
        }

        // Color filtering: remove yellow highlight boxes, red wavy underlines, blue label annotations
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Detect Yellow (high red, high green, low/mid blue) -> convert to white
          const isYellow = (r > 170 && g > 170 && b < 120) || (r > 200 && g > 180 && b < 140);
          
          // Detect Red squiggly underline (high red, low green/blue) -> convert to white
          const isRedSquiggly = (r > 160 && g < 90 && b < 90);

          // Detect Blue overlay labels (like "From Office", "Document Details" in #4361ee / #3b82f6)
          const isBlueAnnotation = (b > 160 && r < 120);

          if (isYellow || isRedSquiggly || isBlueAnnotation) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            continue;
          }

          // Grayscale conversion
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // High contrast binarization curve
          if (gray < 160) {
            gray = Math.max(0, gray * 0.7); // Darken text
          } else {
            gray = 255; // Whiten background
          }

          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          qrCodeText: qrResult ? qrResult.data : null,
          width: canvas.width,
          height: canvas.height
        });
      } catch (err) {
        console.warn('Canvas preprocessing error:', err);
        resolve({
          dataUrl: typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource),
          qrCodeText: null
        });
      }
    };

    img.onerror = () => {
      resolve({
        dataUrl: typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource),
        qrCodeText: null
      });
    };

    img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
  });
}

/**
 * Main OCR & DTS Slip Extractor
 */
export async function extractDtsSlipData(imageSource, onProgress = () => {}) {
  onProgress(10, 'Enhancing image for document scanning...');
  const { dataUrl, qrCodeText } = await preprocessDtsCanvas(imageSource);

  onProgress(30, 'Initializing OCR recognition engine...');
  const worker = await getWorker((prog) => {
    onProgress(30 + Math.round(prog * 0.6), 'Reading text and extracting data fields...');
  });

  // Run OCR
  const result = await worker.recognize(dataUrl);
  const fullText = (result.data && result.data.text) ? result.data.text : '';

  onProgress(95, 'Parsing DTS tracking numbers, office headers, and document details...');
  const parsed = parseDtsSlipText(fullText, result.data, qrCodeText);
  onProgress(100, 'Data extraction complete!');

  return parsed;
}

/**
 * Parses raw text and layout into structured DTS fields:
 * - trackingNo
 * - fromOffice
 * - details
 * - date
 * - toOffice
 */
export function parseDtsSlipText(rawText, ocrData = null, qrCodeText = null) {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const cleanedText = lines.join('\n');

  let trackingNo = '';
  let fromOffice = '';
  let details = '';
  let date = '';
  let toOffice = '';

  // If QR Code yielded a tracking number (e.g. 16 chars or URL/code)
  if (qrCodeText) {
    const qrMatch = qrCodeText.match(/([0-9]{4,10}[0-9]{8}[A-Z0-9]{2,8})/i) || qrCodeText.match(/([0-9A-Z]{12,20})/);
    if (qrMatch) {
      trackingNo = qrMatch[1];
    }
  }

  // 1. Extract DTS Tracking Number from OCR
  if (!trackingNo) {
    // Pattern: 4 digits + 8 digit date (YYYYMMDD) + 4 char code, e.g. 116920260819D2N1
    const tMatch = cleanedText.match(/\b([0-9]{4}20[2-3][0-9][0-1][0-9][0-3][0-9][A-Z0-9]{2,8})\b/i)
      || cleanedText.match(/\b([0-9]{8,14}[A-Z0-9]{2,8})\b/i)
      || cleanedText.match(/\b([0-9]{12,18})\b/);

    if (tMatch) {
      trackingNo = tMatch[1].trim();
    } else {
      // Look for line containing digits and uppercase letters
      for (const line of lines) {
        if (/^[0-9]{4,}[A-Z0-9]{4,}$/i.test(line) && line.length >= 10 && line.length <= 22) {
          trackingNo = line;
          break;
        }
      }
    }
  }

  // 2. Extract From/Office
  // Check known office patterns & headers
  const officeKeywords = [
    /OFFICE OF THE VICE CHANCELLOR[A-Z\s]*/i,
    /OFFICE OF THE CHANCELLOR[A-Z\s]*/i,
    /OFFICE OF THE [A-Z\s]+/i,
    /OFFICE OF [A-Z\s]+/i,
    /VICE CHANCELLOR FOR [A-Z\s]+/i,
    /COLLEGE OF [A-Z\s]+/i,
    /DEPARTMENT OF [A-Z\s]+/i,
    /RESEARCH AND INNOVATION/i,
    /EXTENSION & COMMUNITY/i,
    /HUMAN RESOURCE MANAGEMENT/i,
    /NMFIC/i,
    /CET/i,
    /VCRIE/i
  ];

  for (const line of lines) {
    // Exclude noise or label lines
    if (/^(TRACK DETAILS|DTS Tracking|From Office|Document Details|Receiver|Action Requested)/i.test(line)) {
      continue;
    }
    for (const kw of officeKeywords) {
      if (kw.test(line)) {
        let cleaned = line.replace(/^(From\s*Office\s*:|From\s*:|Office\s*:)\s*/i, '').trim();
        // Remove trailing or leading symbols
        cleaned = cleaned.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
        if (cleaned.length >= 3 && !fromOffice) {
          fromOffice = cleaned;
          break;
        }
      }
    }
  }

  // If still not found, search lines that look like uppercase headers
  if (!fromOffice) {
    for (const line of lines) {
      if (/^[A-Z\s]{8,}$/.test(line) && !/TRACK DETAILS|DOCUMENT DETAILS|ACTION REQUESTED/i.test(line)) {
        fromOffice = line.trim();
        break;
      }
    }
  }

  // 3. Extract Document Details (Subject line + Signatories / Names / Particulars)
  const detailLines = [];
  let capturingDetails = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line matches subject starting tokens
    if (/^(Request for|Letter|Endorsement|Memorandum|Special Order|Travel Order|Purchase Request|Resolution|Proposal|Contract|Agreement|Notice)/i.test(line)) {
      capturingDetails = true;
      detailLines.push(line);
      continue;
    }

    if (capturingDetails) {
      // Stop capturing if we hit other section boundaries
      if (/^(Action Requested|Send:|Receiver|From Office|DTS Tracking|TRACK DETAILS)/i.test(line)) {
        if (/^Particulars:/i.test(line)) {
          detailLines.push(line);
        }
        break;
      }

      // Ignore noise labels
      if (!/^(From Office|Document Details|DTS Tracking No\.?|Receiver|Send:)$/i.test(line)) {
        // Stop if line is the to-office or send date
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(line)) break;
        detailLines.push(line);
      }
    }
  }

  if (detailLines.length > 0) {
    details = detailLines.join('\n');
  } else {
    // Fallback: collect lines between tracking number and send/receiver
    const candidateLines = lines.filter(l => {
      if (/TRACK DETAILS|DTS Tracking|From Office|Document Details|Receiver|Action Requested|Send:/i.test(l)) return false;
      if (l === trackingNo || l === fromOffice) return false;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(l)) return false;
      return l.length > 2;
    });
    if (candidateLines.length > 0) {
      details = candidateLines.slice(0, 6).join('\n');
    }
  }

  // 4. Extract Date Forwarded / Send Date
  // E.g. Send: 8/19/2026 9:34:26 AM or 8/19/2026 or 2026-08-19
  const dateMatch = cleanedText.match(/\b([0-1]?[0-9])[\/\-]([0-3]?[0-9])[\/\-](20[2-3][0-9])\b/)
    || cleanedText.match(/\b(20[2-3][0-9])[\/\-]([0-1]?[0-9])[\/\-]([0-3]?[0-9])\b/);

  if (dateMatch) {
    if (dateMatch[3] && dateMatch[3].length === 4) {
      const mm = String(dateMatch[1]).padStart(2, '0');
      const dd = String(dateMatch[2]).padStart(2, '0');
      const yyyy = dateMatch[3];
      date = `${yyyy}-${mm}-${dd}`;
    } else if (dateMatch[1] && dateMatch[1].length === 4) {
      const yyyy = dateMatch[1];
      const mm = String(dateMatch[2]).padStart(2, '0');
      const dd = String(dateMatch[3]).padStart(2, '0');
      date = `${yyyy}-${mm}-${dd}`;
    }
  }

  // 5. Extract To / Office (e.g. Human Resource Management Office)
  const sendLineIdx = lines.findIndex(l => /Send:/i.test(l));
  if (sendLineIdx !== -1) {
    for (let j = sendLineIdx + 1; j < Math.min(lines.length, sendLineIdx + 4); j++) {
      const l = lines[j];
      if (/OFFICE|DEPARTMENT|MANAGEMENT|DIVISION|CHANCELLOR|COLLEGE/i.test(l) && !/Receiver|Action/i.test(l)) {
        toOffice = l.trim();
        break;
      }
    }
  }

  return {
    trackingNo: trackingNo || '',
    fromOffice: fromOffice || '',
    details: details || '',
    date: date || new Date().toISOString().split('T')[0],
    toOffice: toOffice || '',
    rawText
  };
}

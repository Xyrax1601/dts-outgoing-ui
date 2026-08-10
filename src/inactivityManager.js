// Inactivity Manager & Cross-Tab Auto-Logout Service
// Manages 1-hour user inactivity timeout with 60-second warning modal countdown and cross-tab activity sync.

const TOTAL_INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 Hour (3,600,000 ms)
const WARNING_THRESHOLD_MS = (60 * 60 - 60) * 1000; // 59 Minutes (3,540,000 ms)
const THROTTLE_ACTIVITY_UPDATE_MS = 5000; // Throttle activity updates to once every 5s

export class InactivityManager {
  constructor({ onWarning, onTimeout, onActivityReset }) {
    this.onWarning = onWarning;       // Callback: (remainingSeconds) => void
    this.onTimeout = onTimeout;       // Callback: () => void
    this.onActivityReset = onActivityReset; // Callback: () => void

    this.timerId = null;
    this.lastThrottledUpdate = 0;
    this.isWarningActive = false;

    this.handleUserActivity = this.handleUserActivity.bind(this);
    this.checkInactivityStatus = this.checkInactivityStatus.bind(this);
  }

  start() {
    this.stop();
    this.updateLastActivityTime();
    
    // Register activity listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach(evt => {
      window.addEventListener(evt, this.handleUserActivity, { passive: true });
    });

    // Start 1-second background interval checker
    this.timerId = setInterval(this.checkInactivityStatus, 1000);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach(evt => {
      window.removeEventListener(evt, this.handleUserActivity);
    });
    this.isWarningActive = false;
  }

  updateLastActivityTime() {
    localStorage.setItem('dts_last_activity_time', String(Date.now()));
  }

  getLastActivityTime() {
    const raw = localStorage.getItem('dts_last_activity_time');
    return raw ? parseInt(raw, 10) : Date.now();
  }

  handleUserActivity() {
    const now = Date.now();
    // Throttle updating localStorage to avoid performance overhead
    if (now - this.lastThrottledUpdate > THROTTLE_ACTIVITY_UPDATE_MS) {
      this.lastThrottledUpdate = now;
      this.updateLastActivityTime();

      if (this.isWarningActive) {
        this.isWarningActive = false;
        if (typeof this.onActivityReset === 'function') {
          this.onActivityReset();
        }
      }
    }
  }

  checkInactivityStatus() {
    const now = Date.now();
    const lastActive = this.getLastActivityTime();
    const elapsed = now - lastActive;

    if (elapsed >= TOTAL_INACTIVITY_LIMIT_MS) {
      this.stop();
      if (typeof this.onTimeout === 'function') {
        this.onTimeout();
      }
    } else if (elapsed >= WARNING_THRESHOLD_MS) {
      this.isWarningActive = true;
      const remainingMs = TOTAL_INACTIVITY_LIMIT_MS - elapsed;
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

      if (typeof this.onWarning === 'function') {
        this.onWarning(remainingSeconds);
      }
    } else {
      if (this.isWarningActive) {
        this.isWarningActive = false;
        if (typeof this.onActivityReset === 'function') {
          this.onActivityReset();
        }
      }
    }
  }

  resetTimer() {
    this.isWarningActive = false;
    this.updateLastActivityTime();
  }
}

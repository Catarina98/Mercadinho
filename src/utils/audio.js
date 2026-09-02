// Audio effects disabled as requested by user
class AudioManager {
  constructor() {
    this.enabled = false;
  }

  initContext() {}
  ensureActive() {}
  toggleSound() { return false; }
  playScanBeep() {}
  playSuccessChime() {}
  playErrorBuzz() {}
}

export const audioService = new AudioManager();

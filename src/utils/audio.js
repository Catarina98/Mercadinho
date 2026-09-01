// Web Audio API Sound Generator for POS feedback
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initContext();
  }

  initContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    } catch (e) {
      console.warn("AudioContext not supported", e);
    }
  }

  ensureActive() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound(forceState) {
    if (forceState !== undefined) {
      this.enabled = forceState;
    } else {
      this.enabled = !this.enabled;
    }
    return this.enabled;
  }

  // Pleasant high chirp when item is scanned
  playScanBeep() {
    if (!this.enabled) return;
    this.ensureActive();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, this.ctx.currentTime); // A6
      osc.frequency.exponentialRampToValueAtTime(2637, this.ctx.currentTime + 0.08); // E7

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);

      // Haptic feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate(35);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Joyful two-tone chime when checkout is completed
  playSuccessChime() {
    if (!this.enabled) return;
    this.ensureActive();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (i * 0.08));

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + (i * 0.08));
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (i * 0.08) + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + (i * 0.08));
        osc.stop(this.ctx.currentTime + (i * 0.08) + 0.2);
      });

      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 80]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Alert buzz when item is not found
  playErrorBuzz() {
    if (!this.enabled) return;
    this.ensureActive();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.setValueAtTime(160, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export const audioService = new AudioManager();

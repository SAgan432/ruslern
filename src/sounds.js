// Звуковые эффекты через Web Audio API и синтез речи SpeechSynthesis
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.voiceUri = typeof localStorage !== 'undefined' ? localStorage.getItem('ruslearn_voice_uri') || '' : '';
    this.voiceRate = typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('ruslearn_voice_rate')) || 0.95 : 0.95;
    this.voicePitch = typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('ruslearn_voice_pitch')) || 1.0 : 1.0;
    this.soundPreset = typeof localStorage !== 'undefined' ? localStorage.getItem('ruslearn_sound_preset') || 'cyberpunk' : 'cyberpunk';
    this.voices = [];

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const all = window.speechSynthesis.getVoices() || [];
    this.voices = all.filter(v => v.lang && (v.lang.startsWith('ru') || v.lang.startsWith('RU')));
    if (this.voices.length === 0) {
      this.voices = all; // fallback
    }
    return this.voices;
  }

  getAvailableVoices() {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  setVoice(uri) {
    this.voiceUri = uri;
    if (typeof localStorage !== 'undefined') localStorage.setItem('ruslearn_voice_uri', uri);
  }

  setRate(rate) {
    this.voiceRate = rate;
    if (typeof localStorage !== 'undefined') localStorage.setItem('ruslearn_voice_rate', rate);
  }

  setPitch(pitch) {
    this.voicePitch = pitch;
    if (typeof localStorage !== 'undefined') localStorage.setItem('ruslearn_voice_pitch', pitch);
  }

  setSoundPreset(preset) {
    this.soundPreset = preset;
    if (typeof localStorage !== 'undefined') localStorage.setItem('ruslearn_sound_preset', preset);
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  vibrate(pattern = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  click() {
    this.vibrate(8);
    if (this.soundPreset === 'bell') {
      this.playTone(1200, 'sine', 0.08, 0.03);
    } else if (this.soundPreset === 'arcade') {
      this.playTone(950, 'square', 0.03, 0.04);
    } else {
      this.playTone(800, 'sine', 0.04, 0.04);
    }
  }

  correct() {
    this.vibrate([15, 30, 25]);
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.soundPreset === 'bell') {
        [880, 1108.73, 1318.51].forEach((freq, i) => {
          this.playTone(freq, 'sine', 0.35, 0.05);
        });
      } else {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = this.soundPreset === 'arcade' ? 'square' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.08, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.18);
        });
      }
    } catch (e) {}
  }

  wrong() {
    this.vibrate([40, 50, 40]);
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [311.13, 277.18].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.07, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.2);
      });
    } catch (e) {}
  }

  levelUp() {
    this.vibrate([20, 30, 20, 50]);
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch (e) {}
  }

  speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = this.voiceRate;
      utterance.pitch = this.voicePitch;

      // Применяем выбранный голос
      if (this.voiceUri) {
        const matchingVoice = this.voices.find(v => v.voiceURI === this.voiceUri);
        if (matchingVoice) utterance.voice = matchingVoice;
      } else if (this.voices.length > 0) {
        const ruVoice = this.voices.find(v => v.lang && v.lang.startsWith('ru'));
        if (ruVoice) utterance.voice = ruVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }
}

export const sounds = new SoundFX();

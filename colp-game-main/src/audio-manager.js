export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = [];
    this.audioFiles = [
      '/audio/knock_1.wav',
      '/audio/knock_2.wav',
      '/audio/knock_3.wav',
      '/audio/knock_4.wav',
      '/audio/knock_5.wav',
      '/audio/knock_6.wav',
      '/audio/knock_7.wav',
      '/audio/knock_8.wav',
      '/audio/knock_9.wav',
      '/audio/knock_10.wav',
    ];
    this.sfxVolume = parseFloat(localStorage.getItem('colp_sfx_vol') ?? '0.8');
    this.musicVolume = parseFloat(localStorage.getItem('colp_music_vol') ?? '0.6');
    this.unlocked = false;

    this.musicUrl = '/audio/Da_Busta_Scars_Shrine.mp3';
    this.bgMusic = null;
    this.fadeInterval = null;
  }

  async init() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    for (const url of this.audioFiles) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
          this.buffers.push(audioBuf);
        }
      } catch (err) {
        console.warn('Could not load SFX:', url, err);
      }
    }

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.unlocked = true;

      // Inicia a música no primeiríssimo clique do usuário na página
      this.playMusic();

      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('colp_sfx_vol', String(this.sfxVolume));
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('colp_music_vol', String(this.musicVolume));
    if (this.bgMusic && !this.fadeInterval) {
      this.bgMusic.volume = this.musicVolume;
    }
  }

  playRandomKnock() {
    if (this.sfxVolume <= 0 || !this.ctx || this.buffers.length === 0) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const idx = Math.floor(Math.random() * this.buffers.length);
    const buf = this.buffers[idx];

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.92 + Math.random() * 0.16;

    const gain = this.ctx.createGain();
    gain.gain.value = this.sfxVolume;

    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(0);
  }

  playMusic() {
    if (!this.musicUrl) return;

    // Se a música já estiver tocando, NÃO faz nada e deixa rolar
    if (this.bgMusic && !this.bgMusic.paused) {
      return;
    }

    try {
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }

      if (!this.bgMusic) {
        this.bgMusic = new Audio(this.musicUrl);
        this.bgMusic.loop = true;
      }

      this.bgMusic.volume = 0;

      const startPlayback = () => {
        // Define o segundo aleatório apenas na PRIMEIRA vez que começa a tocar
        if (this.bgMusic.currentTime === 0 && this.bgMusic.duration && isFinite(this.bgMusic.duration) && this.bgMusic.duration > 0) {
          const randomSecond = Math.random() * this.bgMusic.duration;
          this.bgMusic.currentTime = randomSecond;
        }

        this.bgMusic.play().then(() => {
          this.startFadeIn(2.0);
        }).catch((err) => {
          console.warn('[BGM] Autoplay aguardando interação:', err);
        });
      };

      if (this.bgMusic.readyState >= 1) {
        startPlayback();
      } else {
        this.bgMusic.addEventListener('loadedmetadata', startPlayback, { once: true });
        this.bgMusic.load();
      }
    } catch (e) {
      console.warn('Música de fundo não encontrada:', e);
    }
  }

  startFadeIn(durationSeconds = 2.0) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const targetVolume = this.musicVolume;
    if (targetVolume <= 0) {
      if (this.bgMusic) this.bgMusic.volume = 0;
      return;
    }

    const intervalMs = 50;
    const totalSteps = (durationSeconds * 1000) / intervalMs;
    const stepGain = targetVolume / totalSteps;
    let currentVol = 0;

    this.fadeInterval = setInterval(() => {
      currentVol += stepGain;
      if (currentVol >= targetVolume) {
        currentVol = targetVolume;
        if (this.bgMusic) this.bgMusic.volume = currentVol;
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      } else {
        if (this.bgMusic) this.bgMusic.volume = currentVol;
      }
    }, intervalMs);
  }

  // Desativado intencionalmente para não parar a música no Game Over
  stopMusic() {
    return;
  }
}

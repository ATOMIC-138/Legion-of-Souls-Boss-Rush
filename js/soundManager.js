/**
 * 零外部依賴 Web Audio API 合成器音效與動態分層 BGM 引擎 (SoundManager)
 * -------------------------------------------------------------------------
 * 1. 動態分層合成器背景音樂 (Procedural Layered BGM)：
 *    - 一般波次：神秘暗黑奇幻 D 小調低音脈衝 (Bassline) + 星界水晶豎琴琶音 (Arpeggio)
 *    - 大 Boss 降臨 (Wave 10 / 20 / 30)：自動無縫加速切換為高 BPM 史詩君王決戰變奏曲！
 * 2. 全套清脆打擊與技能音效：
 *    - 法杖/隨從射擊、近戰揮砍、爆擊重擊、寶石半音階爬升叮咚聲
 *    - ★2/★3 升星和弦、★★★★ 神話超進化交響號角、聖壇充能完成、哥布林金幣笑聲、陣型切換鏗鏘聲
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.35;

    // 連續撿寶石音階遞增計時器
    this.gemComboCount = 0;
    this.lastGemTime = 0;

    // 節流保護避免同幀數十個敵人同時受擊造成爆音
    this.lastHitTime = 0;
    this.lastShootTime = 0;

    // 動態合成器 BGM 狀態
    this.bgmStep = 0;
    this.bgmTimer = 0;
    this.bgmMode = "normal"; // "normal" | "boss"
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * 每幀更新動態分層合成器背景音樂 (Procedural WebAudio BGM)
   */
  updateBgm(dt, isBossActive = false, isPaused = false) {
    if (this.isMuted || isPaused || !this.ctx || this.ctx.state !== "running") {
      return;
    }

    this.bgmMode = isBossActive ? "boss" : "normal";
    const stepInterval = isBossActive ? 0.165 : 0.25; // Boss 戰節奏加快至 ~180 BPM 八分音符
    this.bgmTimer -= dt;

    if (this.bgmTimer <= 0) {
      this.bgmTimer += stepInterval;
      this._playBgmStep(this.bgmStep, isBossActive, stepInterval);
      this.bgmStep = (this.bgmStep + 1) % 32;
    }
  }

  _playBgmStep(step, isBoss, stepDur) {
    if (!this.ctx) return;

    // 一般波次：D Dorian / Natural Minor 神秘古聖殿旋律
    // D2=73.42, F2=87.31, G2=98.0, A2=110.0, Bb2=116.54, C3=130.81
    const normalBass = [
      73.42, 0, 73.42, 0, 73.42, 0, 110.0, 0,
      116.54, 0, 116.54, 0, 98.0, 0, 110.0, 0,
      73.42, 0, 73.42, 0, 87.31, 0, 110.0, 0,
      130.81, 0, 116.54, 0, 110.0, 0, 87.31, 0
    ];
    // D4=293.66, F4=349.23, G4=392.00, A4=440.00, C5=523.25, D5=587.33, E5=659.25, F5=698.46
    const normalArp = [
      293.66, 349.23, 440.0, 587.33, 440.0, 349.23, 523.25, 440.0,
      349.23, 440.0, 587.33, 698.46, 587.33, 440.0, 523.25, 392.0,
      293.66, 349.23, 440.0, 659.25, 587.33, 440.0, 349.23, 440.0,
      523.25, 440.0, 392.0, 349.23, 440.0, 349.23, 329.63, 293.66
    ];

    // 大 Boss 降臨：D Phrygian Dominant / Harmonic Minor 緊湊史詩決戰旋律
    // D2=73.42, Eb2=77.78, F#2=92.5, G2=98.0, A2=110.0, Bb2=116.54
    const bossBass = [
      73.42, 73.42, 146.83, 73.42, 77.78, 77.78, 73.42, 110.0,
      116.54, 116.54, 110.0, 98.0, 92.5, 98.0, 110.0, 77.78,
      73.42, 73.42, 146.83, 73.42, 98.0, 98.0, 92.5, 73.42,
      77.78, 92.5, 98.0, 110.0, 116.54, 110.0, 92.5, 73.42
    ];
    const bossLead = [
      587.33, 0, 622.25, 587.33, 739.99, 622.25, 587.33, 440.0,
      466.16, 440.0, 392.0, 369.99, 440.0, 0, 587.33, 0,
      587.33, 622.25, 739.99, 783.99, 880.0, 783.99, 739.99, 622.25,
      587.33, 739.99, 622.25, 587.33, 466.16, 440.0, 369.99, 440.0
    ];

    const now = this.ctx.currentTime;

    // 1. 低音 Bassline (經由低通濾波器呈現溫暖深沉類比合成器質感)
    const bassFreq = isBoss ? bossBass[step] : normalBass[step];
    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = isBoss ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(bassFreq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isBoss ? 480 : 320, now);

      const vol = (isBoss ? 0.14 : 0.11) * this.masterVolume;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + stepDur * 1.45);
    }

    // 2. 高音奇幻琶音 / Boss 主旋律
    const arpFreq = isBoss ? bossLead[step] : normalArp[step];
    if (arpFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isBoss ? "triangle" : "sine";
      osc.frequency.setValueAtTime(arpFreq, now);

      const vol = (isBoss ? 0.09 : 0.065) * this.masterVolume;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + stepDur * 1.85);
    }
  }

  _playTone({
    type = "sine",
    freq = 440,
    endFreq = null,
    duration = 0.1,
    volume = 0.3,
    delay = 0
  }) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    const peakVol = Math.max(0.001, volume * this.masterVolume);
    gain.gain.setValueAtTime(peakVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPlayerShoot() {
    this._playTone({
      type: "sine",
      freq: 680,
      endFreq: 320,
      duration: 0.09,
      volume: 0.24
    });
  }

  playMinionShoot() {
    const now = performance.now();
    if (now - this.lastShootTime < 45) return;
    this.lastShootTime = now;

    this._playTone({
      type: "triangle",
      freq: 520 + Math.random() * 80,
      endFreq: 210,
      duration: 0.07,
      volume: 0.16
    });
  }

  playSlash() {
    const now = performance.now();
    if (now - this.lastShootTime < 45) return;
    this.lastShootTime = now;

    this._playTone({
      type: "sawtooth",
      freq: 290,
      endFreq: 95,
      duration: 0.08,
      volume: 0.18
    });
  }

  playHit(isCrit = false) {
    const now = performance.now();
    if (!isCrit && now - this.lastHitTime < 35) return;
    this.lastHitTime = now;

    if (isCrit) {
      this._playTone({
        type: "square",
        freq: 240,
        endFreq: 75,
        duration: 0.11,
        volume: 0.3
      });
      this._playTone({
        type: "triangle",
        freq: 920,
        endFreq: 480,
        duration: 0.08,
        volume: 0.24
      });
    } else {
      this._playTone({
        type: "triangle",
        freq: 170 + Math.random() * 40,
        endFreq: 65,
        duration: 0.06,
        volume: 0.2
      });
    }
  }

  playKill() {
    this._playTone({
      type: "sine",
      freq: 140,
      endFreq: 48,
      duration: 0.11,
      volume: 0.26
    });
  }

  playExplosion() {
    this._playTone({
      type: "sawtooth",
      freq: 120,
      endFreq: 32,
      duration: 0.26,
      volume: 0.42
    });
  }

  playGemPickup() {
    const now = performance.now();
    if (now - this.lastGemTime < 450) {
      this.gemComboCount = Math.min(14, this.gemComboCount + 1);
    } else {
      this.gemComboCount = 0;
    }
    this.lastGemTime = now;

    const baseFreq = 587.33 * Math.pow(1.05946, this.gemComboCount);
    this._playTone({
      type: "sine",
      freq: baseFreq,
      endFreq: baseFreq * 1.25,
      duration: 0.09,
      volume: 0.26
    });
  }

  playPlayerHurt() {
    this._playTone({
      type: "sawtooth",
      freq: 165,
      endFreq: 60,
      duration: 0.18,
      volume: 0.45
    });
  }

  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this._playTone({
        type: "triangle",
        freq,
        endFreq: freq * 1.02,
        duration: 0.22,
        volume: 0.34,
        delay: idx * 0.065
      });
    });
  }

  playMergeStar(newStar = 2) {
    if (newStar >= 4) {
      // ★★★★ 神話超進化交響聖詠
      const mythicChord = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      mythicChord.forEach((freq, idx) => {
        this._playTone({
          type: "triangle",
          freq,
          endFreq: freq * 1.06,
          duration: 0.45,
          volume: 0.46,
          delay: idx * 0.06
        });
      });
      return;
    }
    const base = newStar >= 3 ? 659.25 : 523.25;
    const chord = [base, base * 1.25, base * 1.5, base * 2];
    chord.forEach((freq, idx) => {
      this._playTone({
        type: "sine",
        freq,
        endFreq: freq * 1.08,
        duration: 0.32,
        volume: 0.42,
        delay: idx * 0.055
      });
    });
  }

  playButton() {
    this._playTone({
      type: "sine",
      freq: 660,
      endFreq: 880,
      duration: 0.08,
      volume: 0.3
    });
  }

  playDash() {
    this._playTone({
      type: "sine",
      freq: 320,
      endFreq: 980,
      duration: 0.14,
      volume: 0.38
    });
  }

  playCommandHorn() {
    const notes = [293.66, 440.0, 587.33];
    notes.forEach((freq, idx) => {
      this._playTone({
        type: "sawtooth",
        freq,
        endFreq: freq * 1.03,
        duration: 0.32,
        volume: 0.28,
        delay: idx * 0.07
      });
    });
  }

  playStanceSwitch(isPhalanx = false) {
    this._playTone({
      type: "triangle",
      freq: isPhalanx ? 420 : 560,
      endFreq: isPhalanx ? 280 : 760,
      duration: 0.14,
      volume: 0.34
    });
  }

  playHeal() {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      this._playTone({
        type: "sine",
        freq,
        endFreq: freq * 1.1,
        duration: 0.18,
        volume: 0.24,
        delay: idx * 0.05
      });
    });
  }

  playBossAlert() {
    for (let i = 0; i < 3; i++) {
      this._playTone({
        type: "sawtooth",
        freq: 220,
        endFreq: 110,
        duration: 0.35,
        volume: 0.42,
        delay: i * 0.42
      });
    }
  }

  playPowerup() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      this._playTone({
        type: "triangle",
        freq,
        endFreq: freq * 1.15,
        duration: 0.16,
        volume: 0.35,
        delay: idx * 0.045
      });
    });
  }
}

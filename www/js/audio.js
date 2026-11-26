/* =====================================================================
   심연의 대장간 v5.0 — 사운드 (WebAudio 합성, 외부 파일 없음)
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;
  let ctx = null;
  let master = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function on() {
    const S = G.getState && G.getState();
    return !!(S && S.settings && S.settings.sound);
  }

  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain == null ? 0.2 : gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noise(dur, gain, filterFreq, delay, type) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type || "bandpass";
    f.frequency.setValueAtTime(filterFreq || 1800, t0);
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain == null ? 0.2 : gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    tap() { if (!on()) return; ensure(); tone(520, 0.06, "triangle", 0.11, 380); },
    tick() { if (!on()) return; ensure(); tone(920, 0.035, "square", 0.05); },
    chestShake() { if (!on()) return; ensure(); noise(0.18, 0.09, 420, 0, "lowpass"); tone(90, 0.22, "sine", 0.14, 60); },
    chestOpen() {
      if (!on()) return; ensure();
      noise(0.36, 0.16, 1500, 0, "bandpass");
      tone(180, 0.5, "sawtooth", 0.1, 420, 0.02);
      tone(520, 0.3, "triangle", 0.12, 780, 0.16);
    },
    reveal(rarityIdx) {
      if (!on()) return; ensure();
      const scales = [
        [392, 494, 587],
        [392, 523, 659, 784],
        [440, 554, 659, 880],
        [440, 587, 740, 880, 1108],
        [523, 659, 784, 1046, 1318],
        [523, 698, 880, 1046, 1318, 1568]
      ];
      const notes = scales[Math.max(0, Math.min(5, rarityIdx))];
      notes.forEach((f, i) => {
        tone(f, 0.42, i === 0 ? "triangle" : "sine", 0.13, f * 1.002, i * 0.055);
        tone(f * 2, 0.2, "sine", 0.04, f * 2, i * 0.055 + 0.01);
      });
      if (rarityIdx >= 4) noise(0.7, 0.12, 3200, 0.05, "highpass");
    },
    hit() { if (!on()) return; ensure(); noise(0.06, 0.06, 2400, 0, "bandpass"); tone(160, 0.07, "square", 0.05, 90); },
    crit() { if (!on()) return; ensure(); noise(0.09, 0.11, 3600, 0, "highpass"); tone(880, 0.09, "square", 0.09, 420); },
    anvil() {
      if (!on()) return; ensure();
      noise(0.14, 0.24, 2400, 0, "bandpass");
      tone(1560, 0.28, "triangle", 0.16, 620);
      tone(780, 0.2, "sine", 0.12, 390, 0.005);
    },
    success() {
      if (!on()) return; ensure();
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.34, "triangle", 0.13, f, i * 0.055));
      noise(0.4, 0.1, 4200, 0.02, "highpass");
    },
    fail() {
      if (!on()) return; ensure();
      tone(220, 0.24, "sawtooth", 0.12, 110);
      noise(0.16, 0.1, 300, 0, "lowpass");
    },
    break() {
      if (!on()) return; ensure();
      noise(0.5, 0.25, 2800, 0, "highpass");
      tone(320, 0.5, "sawtooth", 0.15, 60);
      noise(0.7, 0.15, 900, 0.06, "bandpass");
    },
    gold() { if (!on()) return; ensure(); tone(1320, 0.1, "triangle", 0.08, 1760); tone(1760, 0.12, "sine", 0.06, 1320, 0.06); },
    levelup() {
      if (!on()) return; ensure();
      [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, "triangle", 0.14, f, i * 0.09));
    },
    boss() {
      if (!on()) return; ensure();
      tone(70, 0.9, "sawtooth", 0.2, 55);
      tone(140, 0.9, "sine", 0.14, 100);
      noise(0.9, 0.12, 240, 0, "lowpass");
    },
    error() { if (!on()) return; ensure(); tone(220, 0.16, "square", 0.12, 160); }
  };

  G.sfx = function (name, arg) {
    const fn = SFX[name];
    if (!fn) return;
    try { fn(arg); } catch (e) {}
  };
  G.sfxUnlock = function () {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  };
})();

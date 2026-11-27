/* =====================================================================
   심연의 대장간 v5.2 — 사운드 (WebAudio 합성, 외부 파일 없음)
   효과음 24종 + 루프 BGM 2트랙(대장간/전투) + 크로스페이드 + 덕킹
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.34;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
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
  function musicOn() {
    const S = G.getState && G.getState();
    return !!(S && S.settings && S.settings.sound && S.settings.music !== false);
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
    osc.connect(g); g.connect(sfxGain);
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
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    tap() { if (!on()) return; ensure(); tone(520, 0.06, "triangle", 0.11, 380); },
    tick() { if (!on()) return; ensure(); tone(920, 0.035, "square", 0.05); },
    chestSeal() {
      if (!on()) return; ensure();
      tone(58, 0.5, "sine", 0.16, 42);
      noise(0.4, 0.05, 260, 0, "lowpass");
    },
    chestShake() { if (!on()) return; ensure(); noise(0.18, 0.1, 420, 0, "lowpass"); tone(90, 0.22, "sine", 0.15, 60); },
    chestOpen() {
      if (!on()) return; ensure();
      noise(0.36, 0.17, 1500, 0, "bandpass");
      tone(180, 0.5, "sawtooth", 0.1, 420, 0.02);
      tone(520, 0.3, "triangle", 0.12, 780, 0.16);
      tone(70, 0.42, "sine", 0.2, 44, 0);
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
    /* 타격음 3층 — 어택 트랜지언트 + 바디 + 꼬리 */
    hit() {
      if (!on()) return; ensure();
      const r = 0.95 + Math.random() * 0.1;
      noise(0.045, 0.11, 2600 * r, 0, "bandpass");
      tone(150 * r, 0.09, "square", 0.06, 80, 0);
      noise(0.22, 0.05, 900 * r, 0.02, "lowpass");
    },
    crit() {
      if (!on()) return; ensure();
      const r = 0.95 + Math.random() * 0.1;
      noise(0.05, 0.14, 4200 * r, 0, "highpass");
      noise(0.09, 0.12, 3600, 0, "highpass");
      tone(880, 0.09, "square", 0.09, 420);
      tone(120, 0.16, "sawtooth", 0.1, 60, 0);
      noise(0.3, 0.06, 700, 0.03, "lowpass");
    },
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

  /* ================= BGM ================= */
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const TRACKS = {
    forge: {
      bpm: 62, bars: 4,
      chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]
    },
    battle: {
      bpm: 108, bars: 4,
      chords: [[50, 53, 57], [48, 51, 55], [46, 50, 53], [45, 48, 52]]
    }
  };
  let musicName = null;
  let stepIdx = 0;
  let nextTime = 0;
  let musTimer = null;
  let ducked = false;
  let fadeToken = 0;

  function musicLevel() {
    return (ducked ? 0.22 : 1) * 0.55;
  }

  function rampMusic(to, secs) {
    if (!ctx || !musicGain) return;
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(to, t + (secs || 0.6));
  }

  function padNote(f, t0, dur, gain, type) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.8, dur * 0.3));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function perc(freq, dur, gain, t0, type) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type || "lowpass";
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  function playStep(name, step, t) {
    const tr = TRACKS[name];
    if (!tr) return;
    const stepsPerBar = 16;
    const bar = Math.floor(step / stepsPerBar) % tr.bars;
    const s = step % stepsPerBar;
    const stepDur = 60 / tr.bpm / 4;
    const barDur = stepDur * stepsPerBar;
    const chord = tr.chords[bar];

    if (name === "forge") {
      if (s === 0) {
        chord.forEach((m, i) => padNote(midi(m - 12), t, barDur * 1.05, 0.05, i === 0 ? "triangle" : "sine"));
        padNote(midi(chord[0] - 24), t, barDur * 1.1, 0.07, "sine");
      }
      if (s === 8) padNote(midi(chord[2] + 12), t, barDur * 0.5, 0.028, "triangle");
      if (s === 12) perc(360, 0.9, 0.018, t, "lowpass");
      if (step % (stepsPerBar * 4) === 0) {
        [0, 7, 12].forEach((iv, i) => padNote(midi(74 + iv), t + i * 0.16, 2.6, 0.022, "sine"));
      }
      if (step % (stepsPerBar * 8) === 6) perc(520, 3.2, 0.02, t, "bandpass");
    } else {
      if (s % 4 === 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(midi(38), t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.055, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t + 0.2);
      }
      if (s === 0 || s === 8 || s === 12) {
        perc(180, 0.22, 0.14, t, "lowpass");
        padNote(midi(26), t, 0.2, 0.08, "sine");
      }
      if (s % 2 === 1) perc(6200, 0.05, 0.016, t, "highpass");
      if (s % 2 === 0) {
        const seq = [62, 65, 69, 72, 74, 72, 69, 65];
        const n = seq[(step / 2) % seq.length | 0];
        padNote(midi(n), t, stepDur * 1.6, 0.026, "triangle");
      }
      if (s === 0) {
        chord.forEach((m, i) => padNote(midi(m), t, barDur * 0.9, 0.016, "sawtooth"));
      }
    }
  }

  function schedule() {
    if (!ctx || !musicName || !musicGain) return;
    const tr = TRACKS[musicName];
    if (!tr) return;
    const stepDur = 60 / tr.bpm / 4;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    let guard = 0;
    while (nextTime < ctx.currentTime + 0.5 && guard++ < 64) {
      try { playStep(musicName, stepIdx, nextTime); } catch (e) {}
      nextTime += stepDur;
      stepIdx = (stepIdx + 1) % (16 * tr.bars);
    }
  }

  function startScheduler() {
    if (musTimer) return;
    musTimer = setInterval(schedule, 180);
  }

  G.music = function (name, force) {
    ensure();
    if (!ctx) return;
    if (!on() || !musicOn()) { G.musicStop(); return; }
    if (name === musicName && !force) return;
    const token = ++fadeToken;
    const apply = () => {
      if (token !== fadeToken) return;
      if (!name) { musicName = null; return; }
      musicName = name;
      stepIdx = 0;
      nextTime = ctx.currentTime + 0.08;
      startScheduler();
      rampMusic(musicLevel(), 1.1);
    };
    if (musicName) {
      rampMusic(0, 0.5);
      setTimeout(apply, 520);
    } else {
      apply();
    }
  };

  G.musicStop = function () {
    if (musicGain) rampMusic(0, 0.4);
    musicName = null;
  };

  G.musicDuck = function (on) {
    if (!ctx) return;
    ducked = !!on;
    if (musicName) rampMusic(musicLevel(), 0.35);
  };

  G.sfx = function (name, arg) {
    const fn = SFX[name];
    if (!fn) return;
    try { fn(arg); } catch (e) {}
  };
  G.sfxUnlock = function () {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (on() && musicOn()) G.music(musicName || "forge", true);
  };
  G.audioRefresh = function () {
    if (!on() || !musicOn()) { G.musicStop(); return; }
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (!musicName) G.music("forge", true);
    else rampMusic(musicLevel(), 0.4);
  };
  G.audioDebug = function () {
    return {
      state: ctx ? ctx.state : null,
      music: musicName,
      gain: musicGain ? Math.round(musicGain.gain.value * 1000) / 1000 : null,
      ducked: ducked
    };
  };
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { try { ctx.suspend(); } catch (e) {} }
    else { try { ctx.resume(); } catch (e) {} }
  });
})();

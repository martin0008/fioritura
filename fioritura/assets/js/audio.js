/* =========================================================
   Fioritura — paesaggi sonori generati con la Web Audio API
   Nessun file audio: tutto viene sintetizzato nel browser.
   ========================================================= */
(function () {
  "use strict";

  const TRACK_LABELS = {
    rain: "Pioggia lenta",
    waves: "Onde del sud",
    forest: "Bosco di notte",
    musicbox: "Carillon di vetro"
  };

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const rand = (min, max) => min + Math.random() * (max - min);

  class Track {
    constructor(engine, id) {
      this.engine = engine;
      this.id = id;
      this.ctx = engine.ctx;
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.0001;
      this.send = this.ctx.createGain();
      this.send.gain.value = 0.35;
      this.out.connect(engine.master);
      this.out.connect(this.send);
      this.send.connect(engine.reverb);
      this.sources = [];
      this.timeouts = [];
      this.running = true;
      this.nextNote = this.ctx.currentTime + 1;
    }

    setSend(amount) {
      this.send.gain.value = amount;
    }

    start() {
      this.build();
      const now = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.setValueAtTime(0.0001, now);
      this.out.gain.exponentialRampToValueAtTime(1, now + 2.4);
      this.nextNote = now + rand(1.2, 3);
      this.tick();
      this.tickTimer = window.setInterval(() => this.tick(), 420);
    }

    stop() {
      if (!this.running) return;
      this.running = false;
      window.clearInterval(this.tickTimer);
      this.timeouts.forEach((id) => window.clearTimeout(id));
      const now = this.ctx.currentTime;
      try {
        this.out.gain.cancelScheduledValues(now);
        this.out.gain.setValueAtTime(Math.max(this.out.gain.value, 0.0001), now);
        this.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      } catch (error) {
        /* noop */
      }
      window.setTimeout(() => {
        this.sources.forEach((node) => {
          try { node.stop(); } catch (error) { /* noop */ }
          try { node.disconnect(); } catch (error) { /* noop */ }
        });
        try { this.out.disconnect(); } catch (error) { /* noop */ }
        try { this.send.disconnect(); } catch (error) { /* noop */ }
      }, 1100);
    }

    build() {}
    tick() {}

    noiseSource(kind) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.engine.noiseBuffer(kind);
      source.loop = true;
      source.start();
      this.sources.push(source);
      return source;
    }

    lfo(frequency, depth, target, startAt = this.ctx.currentTime) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const gain = this.ctx.createGain();
      gain.gain.value = depth;
      osc.connect(gain);
      gain.connect(target);
      osc.start(startAt);
      this.sources.push(osc);
      this.sources.push(gain);
      return osc;
    }

    drone(frequencies, level, filterFrequency = 800) {
      const now = this.ctx.currentTime;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = filterFrequency;
      filter.Q.value = 0.4;
      filter.connect(this.out);
      frequencies.forEach((frequency, index) => {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = frequency;
        osc.detune.value = index % 2 === 0 ? -4 : 5;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(level, now + 3);
        osc.connect(gain);
        gain.connect(filter);
        osc.start(now);
        this.sources.push(osc);
        this.sources.push(gain);
      });
    }

    /* Campana / nota di piano: fondamentale + parziale, decadimento lungo */
    bell(frequency, time, options = {}) {
      const {
        duration = 2.6,
        level = 0.05,
        pan = rand(-0.45, 0.45),
        partial = 2.005,
        partialLevel = 0.18,
        attack = 0.01,
        cutoff = 2800
      } = options;

      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, time);

      const harmonic = this.ctx.createOscillator();
      harmonic.type = "sine";
      harmonic.frequency.setValueAtTime(frequency * partial, time);

      const envelope = this.ctx.createGain();
      envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.exponentialRampToValueAtTime(level, time + attack);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      const harmonicGain = this.ctx.createGain();
      harmonicGain.gain.value = partialLevel;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, time);
      filter.Q.value = 0.3;

      osc.connect(envelope);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(envelope);
      envelope.connect(filter);

      let output = filter;
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;
        filter.connect(panner);
        output = panner;
      }
      output.connect(this.out);

      osc.start(time);
      harmonic.start(time);
      osc.stop(time + duration + 0.08);
      harmonic.stop(time + duration + 0.08);
    }

    /* Accordo morbido, con attacco e rilascio lunghi */
    pad(frequencies, time, duration, level = 0.012) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, time);
      filter.frequency.linearRampToValueAtTime(1100, time + 4);
      filter.frequency.linearRampToValueAtTime(600, time + duration);
      filter.Q.value = 0.35;
      filter.connect(this.out);

      frequencies.forEach((frequency, index) => {
        const osc = this.ctx.createOscillator();
        osc.type = index % 2 === 0 ? "triangle" : "sine";
        osc.frequency.value = frequency;
        osc.detune.value = (index - 1.5) * 2.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(level, time + 3.2);
        gain.gain.setValueAtTime(level, time + duration - 2.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(time);
        osc.stop(time + duration + 0.1);
      });
    }
  }

  /* ---------------------------------------------------------
     Pioggia lenta — pioggia + pianoforte pentatonico
     --------------------------------------------------------- */
  class RainTrack extends Track {
    build() {
      this.setSend(0.42);

      const rain = this.noiseSource("white");
      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = "bandpass";
      rainFilter.frequency.value = 1450;
      rainFilter.Q.value = 0.45;
      const rainGain = this.ctx.createGain();
      rainGain.gain.value = 0.05;
      rain.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(this.out);
      this.lfo(0.055, 0.012, rainGain.gain);

      const body = this.noiseSource("brown");
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = "lowpass";
      bodyFilter.frequency.value = 360;
      bodyFilter.Q.value = 0.5;
      const bodyGain = this.ctx.createGain();
      bodyGain.gain.value = 0.075;
      body.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(this.out);

      const hiss = this.noiseSource("white");
      const hissFilter = this.ctx.createBiquadFilter();
      hissFilter.type = "highpass";
      hissFilter.frequency.value = 5200;
      const hissGain = this.ctx.createGain();
      hissGain.gain.value = 0.006;
      hiss.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(this.out);

      this.scale = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0];
    }

    tick() {
      const horizon = this.ctx.currentTime + 2.8;
      let guard = 0;
      while (this.nextNote < horizon && this.running && guard < 6) {
        guard += 1;
        const time = this.nextNote;
        const frequency = pick(this.scale);
        this.bell(frequency, time, {
          duration: rand(2.8, 4.6),
          level: rand(0.035, 0.055),
          cutoff: 2400,
          partial: 2.002,
          partialLevel: 0.12
        });

        if (Math.random() < 0.24) {
          const second = pick(this.scale) * (Math.random() < 0.5 ? 0.5 : 1);
          this.bell(second, time + rand(0.28, 0.55), {
            duration: rand(2.4, 4),
            level: rand(0.022, 0.036),
            cutoff: 2000,
            partialLevel: 0.1
          });
        }

        this.nextNote += rand(3.2, 7.4);
      }
    }
  }

  /* ---------------------------------------------------------
     Onde del sud — risacca, drone caldo, campane
     --------------------------------------------------------- */
  class WavesTrack extends Track {
    build() {
      this.setSend(0.55);

      const surf = this.noiseSource("brown");
      const surfFilter = this.ctx.createBiquadFilter();
      surfFilter.type = "lowpass";
      surfFilter.frequency.value = 620;
      surfFilter.Q.value = 0.45;
      const surfGain = this.ctx.createGain();
      surfGain.gain.value = 0.085;
      surf.connect(surfFilter);
      surfFilter.connect(surfGain);
      surfGain.connect(this.out);
      this.lfo(0.052, 0.042, surfGain.gain);

      const foam = this.noiseSource("white");
      const foamFilter = this.ctx.createBiquadFilter();
      foamFilter.type = "bandpass";
      foamFilter.frequency.value = 2100;
      foamFilter.Q.value = 0.55;
      const foamGain = this.ctx.createGain();
      foamGain.gain.value = 0.011;
      foam.connect(foamFilter);
      foamFilter.connect(foamGain);
      foamGain.connect(this.out);
      this.lfo(0.073, 0.008, foamGain.gain);

      this.drone([110, 164.81, 220], 0.009, 700);

      this.notes = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88];
    }

    tick() {
      const horizon = this.ctx.currentTime + 2.8;
      let guard = 0;
      while (this.nextNote < horizon && this.running && guard < 4) {
        guard += 1;
        const time = this.nextNote;
        this.bell(pick(this.notes), time, {
          duration: rand(4.5, 7),
          level: rand(0.024, 0.04),
          cutoff: 1900,
          partial: 2.004,
          partialLevel: 0.09,
          attack: 0.03
        });
        this.nextNote += rand(7, 13);
      }
    }
  }

  /* ---------------------------------------------------------
     Bosco di notte — vento, grilli, un gufo timido
     --------------------------------------------------------- */
  class ForestTrack extends Track {
    build() {
      this.setSend(0.3);

      const wind = this.noiseSource("brown");
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 440;
      windFilter.Q.value = 0.5;
      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.06;
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.out);
      this.lfo(0.037, 0.028, windGain.gain);

      const leaves = this.noiseSource("white");
      const leavesFilter = this.ctx.createBiquadFilter();
      leavesFilter.type = "bandpass";
      leavesFilter.frequency.value = 950;
      leavesFilter.Q.value = 0.4;
      const leavesGain = this.ctx.createGain();
      leavesGain.gain.value = 0.006;
      leaves.connect(leavesFilter);
      leavesFilter.connect(leavesGain);
      leavesGain.connect(this.out);
      this.lfo(0.061, 0.004, leavesGain.gain);

      this.drone([65.41, 98.0, 130.81], 0.009, 520);

      this.nextOwl = this.ctx.currentTime + rand(18, 32);
      this.cricketAt = this.ctx.currentTime + rand(1, 3);
    }

    cricket(start, frequency, pan) {
      const count = 3 + Math.floor(Math.random() * 5);
      for (let index = 0; index < count; index += 1) {
        const time = start + index * rand(0.065, 0.1);
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, time);

        const gain = this.ctx.createGain();
        const peak = rand(0.005, 0.009);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(peak, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

        let output = gain;
        if (this.ctx.createStereoPanner) {
          const panner = this.ctx.createStereoPanner();
          panner.pan.value = pan;
          gain.connect(panner);
          output = panner;
        }
        osc.connect(gain);
        output.connect(this.out);
        osc.start(time);
        osc.stop(time + 0.08);
      }
    }

    owl(time) {
      const hoot = (start, from, to, level) => {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(from, start);
        osc.frequency.exponentialRampToValueAtTime(to, start + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(level, start + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1000;

        osc.connect(gain);
        gain.connect(filter);
        filter.connect(this.out);
        osc.start(start);
        osc.stop(start + 0.8);
      };

      hoot(time, 392, 370, 0.022);
      hoot(time + 0.95, 392, 365, 0.016);
    }

    tick() {
      const now = this.ctx.currentTime;
      const horizon = now + 2.8;

      if (this.cricketAt < horizon) {
        this.cricket(this.cricketAt, rand(3900, 4700), rand(-0.8, 0.8));
        if (Math.random() < 0.35) {
          this.cricket(this.cricketAt + rand(0.3, 0.7), rand(4100, 4800), rand(-0.9, 0.9));
        }
        this.cricketAt = this.cricketAt + rand(1.6, 4.6);
      }

      if (this.nextOwl < horizon) {
        this.owl(this.nextOwl);
        this.nextOwl += rand(26, 48);
      }
    }
  }

  /* ---------------------------------------------------------
     Carillon di vetro — note leggere e accordi sospesi
     --------------------------------------------------------- */
  class MusicBoxTrack extends Track {
    build() {
      this.setSend(0.7);
      this.chords = [
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [130.81, 196.0, 246.94, 329.63],
        [196.0, 246.94, 293.66, 329.63]
      ];
      this.chordIndex = 0;
      this.nextChord = this.ctx.currentTime + 0.5;
      this.scale = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    }

    musicNote(frequency, time, level) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, time);

      const glass = this.ctx.createOscillator();
      glass.type = "sine";
      glass.frequency.setValueAtTime(frequency * 3.01, time);

      const glassGain = this.ctx.createGain();
      glassGain.gain.value = 0.1;

      const gain = this.ctx.createGain();
      const duration = rand(1.7, 2.9);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(4800, time);
      filter.frequency.exponentialRampToValueAtTime(1700, time + duration);

      let output = filter;
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = rand(-0.55, 0.55);
        filter.connect(panner);
        output = panner;
      }

      osc.connect(gain);
      glass.connect(glassGain);
      glassGain.connect(gain);
      gain.connect(filter);
      output.connect(this.out);

      osc.start(time);
      glass.start(time);
      osc.stop(time + duration + 0.05);
      glass.stop(time + duration + 0.05);
    }

    tick() {
      const now = this.ctx.currentTime;
      const horizon = now + 2.8;
      let guard = 0;

      while (this.nextChord < horizon && this.running && guard < 3) {
        guard += 1;
        const chord = this.chords[this.chordIndex % this.chords.length];
        this.chordIndex += 1;
        this.pad(chord, this.nextChord, 15, 0.0085);
        this.nextChord += 16;
      }

      while (this.nextNote < horizon && this.running && guard < 12) {
        guard += 1;
        const time = this.nextNote;
        const frequency = pick(this.scale) * (Math.random() < 0.18 ? 0.5 : 1);
        this.musicNote(frequency, time, rand(0.026, 0.042));

        if (Math.random() < 0.22) {
          const run = 2 + Math.floor(Math.random() * 2);
          for (let index = 1; index <= run; index += 1) {
            if (Math.random() < 0.55) {
              this.musicNote(pick(this.scale), time + index * rand(0.16, 0.24), rand(0.018, 0.03));
            }
          }
        }

        this.nextNote += rand(0.7, 1.85);
      }
    }
  }

  const TRACKS = {
    rain: RainTrack,
    waves: WavesTrack,
    forest: ForestTrack,
    musicbox: MusicBoxTrack
  };

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.compressor = null;
      this.reverb = null;
      this.reverbReturn = null;
      this.activeId = null;
      this.activeTrack = null;
      this.volume = 0.55;
      this.buffers = {};
      this.onchange = null;
      this._loading = false;
    }

    get isPlaying() {
      return Boolean(this.activeTrack);
    }

    get label() {
      return this.activeId ? TRACK_LABELS[this.activeId] : null;
    }

    async ensure() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") {
          try { await this.ctx.resume(); } catch (error) { /* noop */ }
        }
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio non supportata");
      }

      const ctx = new AudioContextClass();
      this.ctx = ctx;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 26;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.02;
      compressor.release.value = 0.32;
      compressor.connect(ctx.destination);

      const master = ctx.createGain();
      master.gain.value = this.gainFor(this.volume);
      master.connect(compressor);

      const reverb = ctx.createConvolver();
      reverb.buffer = this.makeImpulse(3.6, 2.7);
      const reverbReturn = ctx.createGain();
      reverbReturn.gain.value = 0.5;
      reverb.connect(reverbReturn);
      reverbReturn.connect(master);

      this.compressor = compressor;
      this.master = master;
      this.reverb = reverb;
      this.reverbReturn = reverbReturn;

      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch (error) { /* noop */ }
      }
    }

    gainFor(value) {
      const clamped = Math.max(0, Math.min(1, value));
      return Math.pow(clamped, 1.35) * 0.95;
    }

    makeImpulse(seconds, decay) {
      const rate = this.ctx.sampleRate;
      const length = Math.max(1, Math.floor(rate * seconds));
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let index = 0; index < length; index += 1) {
          const envelope = Math.pow(1 - index / length, decay);
          data[index] = (Math.random() * 2 - 1) * envelope;
        }
      }
      return impulse;
    }

    noiseBuffer(kind) {
      if (this.buffers[kind]) return this.buffers[kind];
      const rate = this.ctx.sampleRate;
      const seconds = kind === "brown" ? 6 : 4;
      const length = Math.floor(rate * seconds);
      const buffer = this.ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);

      if (kind === "brown") {
        let last = 0;
        for (let index = 0; index < length; index += 1) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          data[index] = last * 3.2;
        }
      } else {
        for (let index = 0; index < length; index += 1) {
          data[index] = Math.random() * 2 - 1;
        }
      }

      this.buffers[kind] = buffer;
      return buffer;
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.gainFor(this.volume), this.ctx.currentTime, 0.08);
      }
    }

    async play(id) {
      if (!TRACKS[id] || this._loading) return;
      this._loading = true;
      try {
        await this.ensure();
        if (this.activeId === id) return;
        if (this.activeTrack) {
          this.activeTrack.stop();
          this.activeTrack = null;
          this.activeId = null;
        }
        const TrackClass = TRACKS[id];
        const track = new TrackClass(this, id);
        this.activeTrack = track;
        this.activeId = id;
        track.start();
        this.notify();
      } catch (error) {
        console.warn("Audio non disponibile:", error);
        this.activeId = null;
        this.activeTrack = null;
        this.notify();
      } finally {
        this._loading = false;
      }
    }

    stop() {
      if (this.activeTrack) {
        this.activeTrack.stop();
        this.activeTrack = null;
        this.activeId = null;
        this.notify();
      }
    }

    async toggle(id) {
      if (this.activeId === id) {
        this.stop();
      } else {
        await this.play(id);
      }
    }

    notify() {
      if (typeof this.onchange === "function") {
        this.onchange(this.activeId);
      }
    }

    chime() {
      if (!this.ctx || !this.master) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime + 0.08;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, index) => {
        this.chimeNote(frequency, now + index * 0.16, 0.075 - index * 0.008, 3.4);
      });
      this.chimeNote(261.63, now, 0.045, 4.2);
    }

    chimeNote(frequency, time, level, duration) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, time);

      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(frequency * 2.004, time);

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.14;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3200;

      const send = ctx.createGain();
      send.gain.value = 0.6;

      osc.connect(gain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(gain);
      gain.connect(filter);
      filter.connect(this.master);
      filter.connect(send);
      send.connect(this.reverb);

      osc.start(time);
      shimmer.start(time);
      osc.stop(time + duration + 0.1);
      shimmer.stop(time + duration + 0.1);
    }
  }

  window.FiorituraAudio = new SoundEngine();
  window.FiorituraAudio.trackLabels = TRACK_LABELS;
})();

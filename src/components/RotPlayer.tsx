"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A tiny media player whose music is composed live in the browser with the
 * Web Audio API: no audio files, so nothing to license. Each "track" is a
 * chord loop, an arpeggio, a bass line and a drum pattern, played through a
 * low-pass filter with a bed of vinyl hiss.
 */

type Track = {
  title: string;
  bpm: number;
  // Four chords, each as MIDI note numbers, root first.
  chords: number[][];
  arp: number[]; // indexes into the chord, one per eighth note; -1 is a rest
  kick: number[]; // eighth notes (of 8) that get a kick
};

const TRACKS: Track[] = [
  {
    title: "sector_07.wav",
    bpm: 78,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [48, 52, 55, 59],
      [55, 59, 62, 65],
    ],
    arp: [0, 2, 3, 2, 1, 3, 2, -1],
    kick: [0, 5],
  },
  {
    title: "rot_lullaby.wav",
    bpm: 70,
    chords: [
      [50, 53, 57, 60],
      [46, 50, 53, 57],
      [43, 46, 50, 53],
      [45, 49, 52, 55],
    ],
    arp: [3, 2, 1, -1, 2, 3, 0, 2],
    kick: [0, 3, 6],
  },
  {
    title: "dog_on_the_roof.wav",
    bpm: 88,
    chords: [
      [52, 55, 59, 62],
      [48, 52, 55, 59],
      [50, 53, 57, 60],
      [47, 50, 54, 57],
    ],
    arp: [0, -1, 3, 1, 2, -1, 3, 2],
    kick: [0, 2, 5],
  },
];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const LOOKAHEAD = 0.12;
const BARS = 7; // visualiser bars

type Engine = {
  ctx: AudioContext;
  out: GainNode;
  analyser: AnalyserNode;
  noise: AudioBuffer;
  hiss: AudioBufferSourceNode;
};

function makeEngine(): Engine {
  const ctx = new AudioContext();
  const out = ctx.createGain();
  out.gain.value = 0;

  // Muffle everything a little, like it's coming through a wall.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2400;
  tone.Q.value = 0.4;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;

  out.connect(tone).connect(analyser).connect(ctx.destination);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // Constant vinyl hiss with the odd crackle.
  const hiss = ctx.createBufferSource();
  hiss.buffer = noise;
  hiss.loop = true;
  const hissTone = ctx.createBiquadFilter();
  hissTone.type = "highpass";
  hissTone.frequency.value = 3500;
  const hissLevel = ctx.createGain();
  hissLevel.gain.value = 0.012;
  hiss.connect(hissTone).connect(hissLevel).connect(out);
  hiss.start();

  return { ctx, out, analyser, noise, hiss };
}

function voice(e: Engine, type: OscillatorType, freq: number, at: number, length: number, level: number) {
  const osc = e.ctx.createOscillator();
  const amp = e.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(level, at + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0008, at + length);
  osc.connect(amp).connect(e.out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

function kick(e: Engine, at: number) {
  const osc = e.ctx.createOscillator();
  const amp = e.ctx.createGain();
  osc.frequency.setValueAtTime(120, at);
  osc.frequency.exponentialRampToValueAtTime(42, at + 0.18);
  amp.gain.setValueAtTime(0.5, at);
  amp.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
  osc.connect(amp).connect(e.out);
  osc.start(at);
  osc.stop(at + 0.32);
}

function hat(e: Engine, at: number, level: number) {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  const band = e.ctx.createBiquadFilter();
  band.type = "highpass";
  band.frequency.value = 7000;
  const amp = e.ctx.createGain();
  amp.gain.setValueAtTime(level, at);
  amp.gain.exponentialRampToValueAtTime(0.0005, at + 0.05);
  src.connect(band).connect(amp).connect(e.out);
  src.start(at, Math.random());
  src.stop(at + 0.06);
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function RotPlayer() {
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const engine = useRef<Engine | null>(null);
  const bars = useRef<HTMLSpanElement>(null);
  const state = useRef({ step: 0, nextAt: 0, startedAt: 0, track: 0 });

  // Sequencer: schedule notes slightly ahead of time so playback stays tight.
  useEffect(() => {
    if (!playing || !engine.current) return;
    const e = engine.current;
    const s = state.current;
    s.track = track;
    s.step = 0;
    s.nextAt = e.ctx.currentTime + 0.08;
    s.startedAt = e.ctx.currentTime;

    const tick = () => {
      const t = TRACKS[s.track];
      const eighth = 60 / t.bpm / 2;
      while (s.nextAt < e.ctx.currentTime + LOOKAHEAD) {
        const inBar = s.step % 8;
        const chord = t.chords[Math.floor(s.step / 8) % t.chords.length];
        if (inBar === 0) {
          for (const n of chord) voice(e, "triangle", hz(n), s.nextAt, eighth * 7.5, 0.045);
          voice(e, "sine", hz(chord[0] - 12), s.nextAt, eighth * 3.5, 0.2);
        }
        if (inBar === 4) voice(e, "sine", hz(chord[0] - 12), s.nextAt, eighth * 3, 0.15);
        const pick = t.arp[inBar];
        if (pick >= 0) voice(e, "square", hz(chord[pick] + 12), s.nextAt, eighth * 0.9, 0.022);
        if (t.kick.includes(inBar)) kick(e, s.nextAt);
        // Swing the off-beat hats a little late, like a tired drummer.
        hat(e, s.nextAt + (inBar % 2 ? eighth * 0.12 : 0), inBar % 2 ? 0.05 : 0.025);
        s.nextAt += eighth;
        s.step++;
      }
    };

    tick();
    const sequencer = setInterval(tick, 25);

    const levels = new Uint8Array(e.analyser.frequencyBinCount);
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      e.analyser.getByteFrequencyData(levels);
      const kids = bars.current?.children;
      if (kids) {
        for (let i = 0; i < kids.length; i++) {
          const v = levels[1 + i * 3] / 255;
          (kids[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.12, Math.round(v * 6) / 6)})`;
        }
      }
    };
    raf = requestAnimationFrame(draw);
    const time = setInterval(() => setElapsed(e.ctx.currentTime - s.startedAt), 500);

    return () => {
      clearInterval(sequencer);
      clearInterval(time);
      cancelAnimationFrame(raf);
    };
  }, [playing, track]);

  // Stop the sound if the page is torn down.
  useEffect(() => () => void engine.current?.ctx.close(), []);

  const toggle = () => {
    if (!engine.current) engine.current = makeEngine();
    const e = engine.current;
    const now = e.ctx.currentTime;
    e.out.gain.cancelScheduledValues(now);
    e.out.gain.setValueAtTime(e.out.gain.value, now);
    if (playing) {
      e.out.gain.linearRampToValueAtTime(0, now + 0.25);
      setTimeout(() => void e.ctx.suspend(), 300);
      setPlaying(false);
    } else {
      // Don't wait on resume(): some browsers settle it late, and the button
      // should react the moment it's pressed.
      void e.ctx.resume();
      e.out.gain.linearRampToValueAtTime(0.7, now + 0.4);
      setElapsed(0);
      setPlaying(true);
    }
  };

  const skip = () => {
    setTrack((t) => (t + 1) % TRACKS.length);
    setElapsed(0);
  };

  const t = TRACKS[track];

  return (
    <div className={`player${playing ? " is-playing" : ""}`} role="group" aria-label="Music player">
      <button
        type="button"
        className="player-btn"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause music" : "Play music"}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          {playing ? (
            <path fill="currentColor" d="M3 2h4v12H3zM9 2h4v12H9z" />
          ) : (
            <path fill="currentColor" d="M4 2h2v1h2v1h2v1h2v1h2v4h-2v1h-2v1H8v1H6v1H4z" />
          )}
        </svg>
      </button>
      <div className="player-info">
        <span className="player-title">
          <span className="player-scroll">{t.title}</span>
        </span>
        <span className="player-meta">
          {playing ? clock(elapsed) : "null.rot radio"} · {t.bpm} bpm
        </span>
      </div>
      <span ref={bars} className="player-bars" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <button type="button" className="player-btn" onClick={skip} aria-label="Next track">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path fill="currentColor" d="M2 2h2v1h2v1h2v1h1v6H8v1H6v1H4v1H2zM11 2h3v12h-3z" />
        </svg>
      </button>
    </div>
  );
}

export type FirstString = "pa" | "ma" | "ni";

export const FIRST_STRINGS: readonly FirstString[] = ["pa", "ma", "ni"];

/** Mandra Pa, Ma or Ni relative to the (madhya) Sa; for ragas without Pa. */
const FIRST_STRING_RATIOS: Record<FirstString, number> = { pa: 0.75, ma: 2 / 3, ni: 0.9375 };

/** Swappable drone source: a synthesized tanpura now, a recorded one later. */
export interface Drone {
  start(saHz: number): void;
  stop(): void;
  setSa(saHz: number): void;
  setVolume(v: number): void;
}

const PLUCK_INTERVAL_S = 0.9;
const LOOKAHEAD_S = 0.3;
const SCHEDULER_INTERVAL_MS = 50;
const ATTACK_S = 0.02;
const DECAY_S = 2.5;
const FILTER_HZ = 1800;
// Peak level of one pluck; leaves headroom for several overlapping strings.
const PLUCK_PEAK = 0.22;
const RETUNE_TIME_CONSTANT_S = 0.05;
const FADE_TIME_CONSTANT_S = 0.08;
const TEARDOWN_DELAY_MS = 600;

interface Voice {
  osc: OscillatorNode;
  /** Frequency as a multiple of Sa. */
  ratio: number;
}

interface Graph {
  master: GainNode;
  compressor: DynamicsCompressorNode;
  voices: Set<Voice>;
  timer: number;
}

/**
 * Classic four-string tanpura: first string (Pa/Ma/Ni), Sa, Sa, kharaj Sa, plucked in that order.
 * Plucks are scheduled on the AudioContext clock a little ahead of time, so timing never drifts
 * with the JS timer. Output goes to `destination` only, never to the pitch analyser.
 */
export class SynthDrone implements Drone {
  private graph: Graph | null = null;
  private saHz = 0;
  private volume = 0.5;
  private firstString: FirstString = "pa";
  private nextPluckTime = 0;
  private nextString = 0;

  constructor(private readonly context: AudioContext) {}

  start(saHz: number): void {
    this.saHz = saHz;
    if (this.graph) return;

    const { context } = this;
    const master = context.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(this.volumeGain(), context.currentTime, FADE_TIME_CONSTANT_S);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;

    master.connect(compressor);
    compressor.connect(context.destination);

    const graph: Graph = { master, compressor, voices: new Set(), timer: 0 };
    graph.timer = window.setInterval(() => this.schedule(graph), SCHEDULER_INTERVAL_MS);
    this.graph = graph;
    this.nextPluckTime = context.currentTime + 0.05;
    this.nextString = 0;
    this.schedule(graph);
  }

  stop(): void {
    const graph = this.graph;
    if (!graph) return;
    this.graph = null;
    window.clearInterval(graph.timer);

    const now = this.context.currentTime;
    graph.master.gain.cancelScheduledValues(now);
    graph.master.gain.setTargetAtTime(0, now, FADE_TIME_CONSTANT_S);
    window.setTimeout(() => {
      graph.voices.forEach(({ osc }) => osc.stop());
      graph.master.disconnect();
      graph.compressor.disconnect();
    }, TEARDOWN_DELAY_MS);
  }

  /** Retunes smoothly, including strings that are still ringing. */
  setSa(saHz: number): void {
    this.saHz = saHz;
    if (!this.graph) return;
    const now = this.context.currentTime;
    this.graph.voices.forEach(({ osc, ratio }) =>
      osc.frequency.setTargetAtTime(saHz * ratio, now, RETUNE_TIME_CONSTANT_S),
    );
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.graph?.master.gain.setTargetAtTime(
      this.volumeGain(),
      this.context.currentTime,
      RETUNE_TIME_CONSTANT_S,
    );
  }

  /** Applies from the next pluck of the first string. */
  setFirstString(first: FirstString): void {
    this.firstString = first;
  }

  // Squared so the slider feels roughly even to the ear.
  private volumeGain(): number {
    return this.volume * this.volume;
  }

  private schedule(graph: Graph): void {
    const now = this.context.currentTime;
    // After a stall (e.g. a backgrounded tab) skip the missed plucks instead of bursting them.
    if (this.nextPluckTime < now) this.nextPluckTime = now + 0.02;
    while (this.nextPluckTime < now + LOOKAHEAD_S) {
      this.pluck(graph, this.nextString, this.nextPluckTime);
      this.nextPluckTime += PLUCK_INTERVAL_S;
      this.nextString = (this.nextString + 1) % 4;
    }
  }

  private pluck(graph: Graph, stringIndex: number, when: number): void {
    const { context } = this;
    const ratio =
      stringIndex === 0 ? FIRST_STRING_RATIOS[this.firstString] : stringIndex === 3 ? 0.5 : 1;

    const osc = context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = this.saHz * ratio;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = FILTER_HZ;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(PLUCK_PEAK, when + ATTACK_S);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + ATTACK_S + DECAY_S);

    osc.connect(filter).connect(envelope).connect(graph.master);
    osc.start(when);
    osc.stop(when + ATTACK_S + DECAY_S + 0.1);

    const voice: Voice = { osc, ratio };
    graph.voices.add(voice);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
      graph.voices.delete(voice);
    };
  }
}

/** Which tanpura the user hears. The synth is also the fallback if the recording fails to load. */
export type DroneSource = "sample" | "synth";

export const DRONE_SOURCES: readonly DroneSource[] = ["sample", "synth"];

/** Seamlessly looping recording (see public/audio/CREDITS.md). */
export const TANPURA_SAMPLE = { url: "/audio/tanpura-c-sharp-3.wav", saHz: 138.59 } as const;

// The recording is normalised to ~-1 dBFS peak; this extra gain leaves loud settings that can
// compete with a voice on a phone speaker, with a limiter below to prevent clipping.
const SAMPLE_LEVEL = 1.8;

/**
 * Loops a recorded tanpura. It is transposed by changing `playbackRate`, so tempo and timbre shift
 * with it; the further your Sa is from the recorded one, the less natural it sounds.
 */
export class SampleDrone implements Drone {
  private graph: {
    source: AudioBufferSourceNode;
    master: GainNode;
    limiter: DynamicsCompressorNode;
  } | null = null;
  private saHz = 0;
  private volume = 0.5;

  constructor(
    private readonly context: AudioContext,
    private readonly buffer: AudioBuffer,
    /** Sa the recording was made in. */
    private readonly recordedSaHz: number,
  ) {}

  start(saHz: number): void {
    this.saHz = saHz;
    if (this.graph) return;

    const { context } = this;
    const master = context.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(this.volumeGain(), context.currentTime, FADE_TIME_CONSTANT_S);

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    master.connect(limiter);
    limiter.connect(context.destination);

    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.playbackRate.value = saHz / this.recordedSaHz;
    source.connect(master);
    source.start();
    this.graph = { source, master, limiter };
  }

  stop(): void {
    const graph = this.graph;
    if (!graph) return;
    this.graph = null;

    const now = this.context.currentTime;
    graph.master.gain.cancelScheduledValues(now);
    graph.master.gain.setTargetAtTime(0, now, FADE_TIME_CONSTANT_S);
    window.setTimeout(() => {
      graph.source.stop();
      graph.source.disconnect();
      graph.master.disconnect();
      graph.limiter.disconnect();
    }, TEARDOWN_DELAY_MS);
  }

  setSa(saHz: number): void {
    this.saHz = saHz;
    this.graph?.source.playbackRate.setTargetAtTime(
      saHz / this.recordedSaHz,
      this.context.currentTime,
      RETUNE_TIME_CONSTANT_S,
    );
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.graph?.master.gain.setTargetAtTime(
      this.volumeGain(),
      this.context.currentTime,
      RETUNE_TIME_CONSTANT_S,
    );
  }

  private volumeGain(): number {
    return this.volume * this.volume * SAMPLE_LEVEL;
  }
}

let synth: SynthDrone | null = null;
let sample: Promise<SampleDrone> | null = null;
let sampleBytes: Promise<ArrayBuffer> | null = null;

export function getSynthDrone(context: AudioContext): SynthDrone {
  synth ??= new SynthDrone(context);
  return synth;
}

/** Starts downloading the recording so it is ready when the drone is switched on. */
export function prefetchTanpuraSample(): void {
  sampleBytes ??= fetch(TANPURA_SAMPLE.url).then((response) => {
    if (!response.ok) throw new Error(`Tanpura sample request failed: ${response.status}`);
    return response.arrayBuffer();
  });
  // A failed prefetch is retried (and reported) by getSampleDrone; avoid an unhandled rejection here.
  sampleBytes.catch(() => {
    sampleBytes = null;
  });
}

/** Rejects if the recording can't be fetched or decoded; callers fall back to the synth. */
export function getSampleDrone(context: AudioContext): Promise<SampleDrone> {
  if (!sample) {
    prefetchTanpuraSample();
    const bytes = sampleBytes;
    if (!bytes) return Promise.reject(new Error("Tanpura sample unavailable"));
    sample = bytes
      // decodeAudioData detaches the buffer it is given, so decode a copy.
      .then((data) => context.decodeAudioData(data.slice(0)))
      .then((buffer) => new SampleDrone(context, buffer, TANPURA_SAMPLE.saHz));
    sample.catch(() => {
      sample = null;
      sampleBytes = null;
    });
  }
  return sample;
}

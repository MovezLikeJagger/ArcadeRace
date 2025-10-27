import { CarTelemetry } from '../physics/BicycleCar';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class AudioEngine {
  private context: AudioContext | null = null;
  private engineLow: OscillatorNode | null = null;
  private engineHigh: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private squealGain: GainNode | null = null;
  private squealNoise: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  constructor(private readonly autoStart = true) {
    if (this.autoStart) {
      window.addEventListener('pointerdown', () => this.init(), { once: true });
      window.addEventListener('keydown', () => this.init(), { once: true });
    }
  }

  async init() {
    if (this.initialized) return;
    this.context = new AudioContext();
    await this.context.resume();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.context.destination);

    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.masterGain);

    this.engineLow = this.context.createOscillator();
    this.engineLow.type = 'sawtooth';
    this.engineLow.frequency.value = 80;
    this.engineLow.connect(this.engineGain);
    this.engineLow.start();

    this.engineHigh = this.context.createOscillator();
    this.engineHigh.type = 'square';
    this.engineHigh.frequency.value = 160;
    this.engineHigh.connect(this.engineGain);
    this.engineHigh.start();

    this.squealGain = this.context.createGain();
    this.squealGain.gain.value = 0;
    this.squealGain.connect(this.masterGain);

    this.squealNoise = this.context.createBufferSource();
    this.squealNoise.buffer = this.createNoiseBuffer();
    this.squealNoise.loop = true;
    this.squealNoise.connect(this.squealGain);
    this.squealNoise.start();

    this.initialized = true;
  }

  update(telemetry: CarTelemetry) {
    if (!this.context || !this.engineGain || !this.engineLow || !this.engineHigh || !this.squealGain) return;
    const rpm = clamp(telemetry.rpm, 800, 9000);
    const normalized = (rpm - 800) / (9000 - 800);
    const lowFreq = 60 + normalized * 160;
    const highFreq = 180 + normalized * 520;
    this.engineLow.frequency.setTargetAtTime(lowFreq, this.context.currentTime, 0.05);
    this.engineHigh.frequency.setTargetAtTime(highFreq, this.context.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(0.15 + normalized * 0.35, this.context.currentTime, 0.1);

    const squeal = clamp(telemetry.slip * 2.5, 0, 1);
    this.squealGain.gain.setTargetAtTime(squeal * 0.4, this.context.currentTime, 0.05);
  }

  playCollision(intensity: number) {
    if (!this.context || !this.masterGain) return;
    const hitGain = this.context.createGain();
    hitGain.gain.value = intensity * 0.4;
    hitGain.connect(this.masterGain);
    const burst = this.context.createBufferSource();
    burst.buffer = this.createNoiseBuffer();
    burst.loop = false;
    burst.connect(hitGain);
    burst.start();
    burst.stop(this.context.currentTime + 0.2);
  }

  private createNoiseBuffer() {
    if (!this.context) {
      throw new Error('Audio context not initialized');
    }
    const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

type LapInfo = {
  currentLapTime: number;
  bestLapTime: number | null;
  lapCount: number;
  checkpoint: number;
};

type GhostInfo = {
  active: boolean;
  recording: boolean;
};

type AIInfo = {
  enabled: boolean;
};

type TelemetryInfo = {
  speed: number;
  slip: number;
  rpm: number;
};

export class HUD {
  private readonly container: HTMLElement;
  private readonly center: HTMLElement;
  private readonly fpsCounter: HTMLElement;
  private fpsEnabled = false;
  private fps = 0;
  private fpsTimer = 0;

  constructor() {
    const container = document.getElementById('hud');
    const center = document.getElementById('hud-center');
    const fpsCounter = document.getElementById('fps');
    if (!container || !center || !fpsCounter) {
      throw new Error('HUD elements missing from DOM');
    }
    this.container = container;
    this.center = center;
    this.fpsCounter = fpsCounter;
  }

  toggleFPS() {
    this.fpsEnabled = !this.fpsEnabled;
    this.fpsCounter.style.display = this.fpsEnabled ? 'block' : 'none';
  }

  updateTelemetry(info: TelemetryInfo) {
    const speedKmh = info.speed * 3.6;
    const slipPercent = Math.min(info.slip * 100, 999).toFixed(1);
    this.writeLines([
      `Speed: ${speedKmh.toFixed(1)} km/h`,
      `Slip: ${slipPercent}%`,
      `RPM: ${info.rpm.toFixed(0)}`,
    ]);
  }

  updateLapInfo(info: LapInfo) {
    const best = info.bestLapTime ? `${info.bestLapTime.toFixed(2)}s` : '--';
    this.center.textContent = `Lap ${info.lapCount} • Split ${info.checkpoint + 1} • Current ${info.currentLapTime.toFixed(
      2
    )}s • Best ${best}`;
  }

  updateGhost(info: GhostInfo) {
    const message = info.active
      ? info.recording
        ? 'Ghost: recording'
        : 'Ghost: replaying'
      : 'Ghost: off';
    this.appendLine(message);
  }

  updateAI(info: AIInfo) {
    this.appendLine(info.enabled ? 'AI Opponents: ON' : 'AI Opponents: OFF');
  }

  updateFPS(dt: number) {
    if (!this.fpsEnabled) return;
    this.fpsTimer += dt;
    this.fps += 1;
    if (this.fpsTimer >= 0.5) {
      const fps = Math.round(this.fps / this.fpsTimer);
      this.fpsCounter.textContent = `${fps} FPS`;
      this.fpsTimer = 0;
      this.fps = 0;
    }
  }

  private writeLines(lines: string[]) {
    this.container.innerHTML = '';
    lines.forEach((line) => {
      const element = document.createElement('div');
      element.className = 'hud__line';
      element.textContent = line;
      this.container.appendChild(element);
    });
  }

  private appendLine(text: string) {
    const element = document.createElement('div');
    element.className = 'hud__line';
    element.textContent = text;
    this.container.appendChild(element);
  }
}

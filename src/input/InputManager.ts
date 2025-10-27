export type InputSnapshot = {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: number;
  reset: boolean;
  toggleGhost: boolean;
  toggleAI: boolean;
  toggleFPS: boolean;
};

export type InputConfig = {
  steeringDeadZone: number;
  triggerDeadZone: number;
};

const STORAGE_KEY = 'arcade-race-input-config';

const defaultConfig: InputConfig = {
  steeringDeadZone: 0.08,
  triggerDeadZone: 0.1,
};

export class InputManager {
  private keyState = new Map<string, boolean>();
  private snapshot: InputSnapshot = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: 0,
    reset: false,
    toggleGhost: false,
    toggleAI: false,
    toggleFPS: false,
  };
  private config: InputConfig = defaultConfig;
  private toggledKeys = new Set<string>();

  constructor() {
    this.loadConfig();
    window.addEventListener('keydown', (event) => this.onKey(event, true));
    window.addEventListener('keyup', (event) => this.onKey(event, false));
    window.addEventListener(
      'arcade-race:set-input-config' as any,
      (event: Event) => {
        const detail = (event as CustomEvent<Partial<InputConfig>>).detail;
        if (detail) {
          this.setConfig(detail);
        }
      }
    );
  }

  getConfig() {
    return this.config;
  }

  setConfig(config: Partial<InputConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
  }

  update(): InputSnapshot {
    const throttle = this.keyState.get('ArrowUp') || this.keyState.get('KeyW') ? 1 : 0;
    const brake = this.keyState.get('ArrowDown') || this.keyState.get('KeyS') ? 1 : 0;
    const steerLeft = this.keyState.get('ArrowLeft') || this.keyState.get('KeyA') ? 1 : 0;
    const steerRight = this.keyState.get('ArrowRight') || this.keyState.get('KeyD') ? 1 : 0;
    const handbrake = this.keyState.get('Space') ? 1 : 0;

    let steer = steerRight - steerLeft;

    const gamepad = this.getGamepad();
    if (gamepad) {
      const steerAxis = this.applyDeadZone(gamepad.axes[0] ?? 0, this.config.steeringDeadZone);
      const throttleButton = gamepad.buttons[7] ?? gamepad.buttons[1];
      const brakeButton = gamepad.buttons[6] ?? gamepad.buttons[0];
      const throttleValue = throttleButton ? throttleButton.value : 0;
      const brakeValue = brakeButton ? brakeButton.value : 0;
      steer = steerAxis;
      this.snapshot.throttle = Math.max(throttle, this.applyDeadZone(throttleValue, this.config.triggerDeadZone));
      this.snapshot.brake = Math.max(brake, this.applyDeadZone(brakeValue, this.config.triggerDeadZone));
      this.snapshot.handbrake = Math.max(handbrake, gamepad.buttons[1]?.value ?? 0);
    } else {
      this.snapshot.throttle = throttle;
      this.snapshot.brake = brake;
      this.snapshot.handbrake = handbrake;
    }

    this.snapshot.steer = steer;
    this.snapshot.reset = this.consumeToggle('KeyR');
    this.snapshot.toggleGhost = this.consumeToggle('KeyG');
    this.snapshot.toggleAI = this.consumeToggle('KeyI');
    this.snapshot.toggleFPS = this.consumeToggle('KeyF');

    return { ...this.snapshot };
  }

  private getGamepad() {
    const pads = navigator.getGamepads?.();
    if (!pads) return null;
    for (const pad of pads) {
      if (pad && pad.connected) {
        return pad;
      }
    }
    return null;
  }

  private applyDeadZone(value: number, deadZone: number) {
    const abs = Math.abs(value);
    if (abs < deadZone) return 0;
    if (value >= 0 && value <= 1) {
      return Math.min(1, (value - deadZone) / (1 - deadZone));
    }
    const sign = Math.sign(value);
    const magnitude = (abs - deadZone) / (1 - deadZone);
    return magnitude * sign;
  }

  private onKey(event: KeyboardEvent, pressed: boolean) {
    if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement | null)?.nodeName ?? '')) return;
    this.keyState.set(event.code, pressed);
    if (pressed && ['KeyR', 'KeyG', 'KeyI', 'KeyF'].includes(event.code)) {
      this.toggledKeys.add(event.code);
      event.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.preventDefault();
    }
  }

  private consumeToggle(code: string) {
    const toggled = this.toggledKeys.has(code);
    if (toggled) {
      this.toggledKeys.delete(code);
    }
    return toggled;
  }

  private loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load input config', error);
    }
  }
}

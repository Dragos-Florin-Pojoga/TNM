export type AppStateName =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'regenerating'
  | 'error';

type TransitionTable = Record<AppStateName, AppStateName[]>;

const VALID_TRANSITIONS: TransitionTable = {
  uninitialized: ['loading'],
  loading: ['ready', 'error'],
  ready: ['playing', 'loading', 'regenerating'],
  playing: ['paused', 'ready', 'loading', 'regenerating'],
  paused: ['playing', 'loading', 'regenerating'],
  regenerating: ['ready', 'error'],
  error: ['uninitialized', 'loading'],
};

type StateCallback = (to: AppStateName, from: AppStateName) => void;

export class AppState {
  private _current: AppStateName = 'uninitialized';
  private enterHooks = new Map<AppStateName, StateCallback[]>();
  private exitHooks = new Map<AppStateName, StateCallback[]>();

  get current(): AppStateName {
    return this._current;
  }

  transition(to: AppStateName): boolean {
    const allowed = VALID_TRANSITIONS[this._current];
    if (!allowed || !allowed.includes(to)) {
      console.warn(`Invalid state transition: ${this._current} → ${to}`);
      return false;
    }

    const from = this._current;
    this._current = to;

    this.exitHooks.get(from)?.forEach(fn => fn(to, from));
    this.enterHooks.get(to)?.forEach(fn => fn(to, from));

    return true;
  }

  onEnter(state: AppStateName, cb: StateCallback): void {
    const hooks = this.enterHooks.get(state);
    if (hooks) hooks.push(cb);
    else this.enterHooks.set(state, [cb]);
  }

  onExit(state: AppStateName, cb: StateCallback): void {
    const hooks = this.exitHooks.get(state);
    if (hooks) hooks.push(cb);
    else this.exitHooks.set(state, [cb]);
  }
}

declare module "@barba/core" {
  interface HookPayload {
    current?: { namespace?: string };
    next?: { namespace?: string };
  }

  interface BarbaHooks {
    do(name: string, payload?: HookPayload): Promise<void>;
  }

  interface BarbaInstance {
    init(options?: {
      preventRunning?: boolean;
      prevent?: () => boolean;
      transitions?: unknown[];
    }): void;
    destroy(): void;
    hooks: BarbaHooks;
  }

  const barba: BarbaInstance;
  export default barba;
}

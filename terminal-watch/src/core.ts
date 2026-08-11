// Pure terminal-output matching, kept free of the VS Code API so it can be
// unit-tested in plain Node.

const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export const BUFFER_LIMIT = 1000;

export interface TriggerState {
  buffer: string;
  lastTriggerTime: number;
  /**
   * Whether the user has typed in the watched terminal since the last
   * notification was sent. When `requireUserInput` is enabled, a trigger only
   * fires while this is true.
   */
  userTyped: boolean;
}

/**
 * Options controlling how output is scanned.
 *
 * `cooldownMs` is the minimum interval between sent notifications, measured
 * from the last sent notification. `requireUserInput` additionally suppresses
 * a match unless the user has typed in the terminal since the last
 * notification — a suppressed match is consumed (buffer cleared) rather than
 * deferred, so stale output never fires later.
 */
export interface ScanOptions {
  cooldownMs: number;
  now?: number;
  requireUserInput?: boolean;
}

export function stripAnsi(data: string): string {
  return data.replace(ANSI_REGEX, "");
}

export interface CompiledTriggers {
  triggers: RegExp[];
  invalid: string[];
}

export function compileTriggers(patterns: string[]): CompiledTriggers {
  const triggers: RegExp[] = [];
  const invalid: string[] = [];

  for (const pattern of patterns) {
    try {
      triggers.push(new RegExp(pattern));
    } catch {
      invalid.push(pattern);
    }
  }

  return { triggers, invalid };
}

/**
 * Appends output to the trigger buffer and, when a trigger matches outside the
 * cooldown window, returns the matched pattern source. Returns undefined
 * otherwise. Mutates `state`.
 *
 * A match inside the cooldown window is deferred (the buffer is kept so it can
 * still fire once the cooldown passes). A match outside the window is
 * consumed (buffer cleared). When `requireUserInput` is enabled, a match
 * detected while the user has not typed since the last notification is
 * consumed and suppressed, so stale output can never resurface later. The
 * caller closes the gate (`state.userTyped = false`) only when it actually
 * sends a notification.
 */
export function scanOutput(
  state: TriggerState,
  data: string,
  triggers: RegExp[],
  options: ScanOptions,
): string | undefined {
  state.buffer = (state.buffer + stripAnsi(data)).slice(-BUFFER_LIMIT);
  const now = options.now ?? Date.now();
  const requireUserInput = options.requireUserInput ?? false;

  for (const regex of triggers) {
    regex.lastIndex = 0;
    if (!regex.test(state.buffer)) {
      continue;
    }
    if (requireUserInput && !state.userTyped) {
      // Suppressed: the user hasn't typed since the last notification. The
      // match is consumed regardless of the cooldown window, so it can never
      // resurface from stale output later.
      state.buffer = "";
      return undefined;
    }
    if (now - state.lastTriggerTime <= options.cooldownMs) {
      // Deferred: keep the buffer so the match can fire once the cooldown passes.
      return undefined;
    }

    state.buffer = "";
    state.lastTriggerTime = now;
    return regex.source;
  }

  return undefined;
}

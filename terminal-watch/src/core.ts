// Pure terminal-output matching, kept free of the VS Code API so it can be
// unit-tested in plain Node.

const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export const BUFFER_LIMIT = 1000;

export interface TriggerState {
  buffer: string;
  lastTriggerTime: number;
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
 * cooldown window, resets the buffer and returns the matched pattern source.
 * Returns undefined otherwise. Mutates `state`.
 */
export function scanOutput(
  state: TriggerState,
  data: string,
  triggers: RegExp[],
  cooldownMs: number,
  now: number = Date.now(),
): string | undefined {
  state.buffer = (state.buffer + stripAnsi(data)).slice(-BUFFER_LIMIT);

  for (const regex of triggers) {
    regex.lastIndex = 0;
    if (!regex.test(state.buffer)) {
      continue;
    }
    if (now - state.lastTriggerTime <= cooldownMs) {
      return undefined;
    }
    state.lastTriggerTime = now;
    state.buffer = "";
    return regex.source;
  }

  return undefined;
}

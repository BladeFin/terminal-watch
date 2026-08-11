import * as assert from "assert";
import { suite, test } from "mocha";
import {
  BUFFER_LIMIT,
  compileTriggers,
  scanOutput,
  stripAnsi,
  type TriggerState,
} from "../core";

function newState(): TriggerState {
  // userTyped starts true so the first trigger of a fresh terminal notifies.
  return { buffer: "", lastTriggerTime: 0, userTyped: true };
}

suite("core", () => {
  test("stripAnsi removes terminal escape sequences", () => {
    assert.strictEqual(stripAnsi("\x1b[32mgreen\x1b[0m"), "green");
    assert.strictEqual(stripAnsi("plain text"), "plain text");
  });

  test("compileTriggers builds regexes and reports invalid patterns", () => {
    const { triggers, invalid } = compileTriggers([
      "Build successful",
      "\\d+ tests passed",
      "[",
    ]);
    assert.strictEqual(triggers.length, 2);
    assert.deepStrictEqual(invalid, ["["]);
    assert.ok(triggers[0].test("Build successful"));
    assert.ok(triggers[1].test("42 tests passed"));
  });

  test("scanOutput matches a trigger and resets the buffer", () => {
    const state = newState();
    const { triggers } = compileTriggers(["Build successful"]);

    const match = scanOutput(state, "Build successful", triggers, {
      cooldownMs: 5000,
      now: 1_000_000,
    });

    assert.strictEqual(match, "Build successful");
    assert.strictEqual(state.buffer, "");
    assert.strictEqual(state.lastTriggerTime, 1_000_000);
  });

  test("scanOutput respects the cooldown window", () => {
    const state: TriggerState = {
      buffer: "",
      lastTriggerTime: 1_000_000,
      userTyped: true,
    };
    const { triggers } = compileTriggers(["done"]);

    const match = scanOutput(state, "done", triggers, {
      cooldownMs: 5000,
      now: 1_001_000,
    });

    assert.strictEqual(match, undefined);
    // Output is kept so a later match can still fire
    assert.strictEqual(state.buffer, "done");
  });

  test("scanOutput fires again once the cooldown elapses", () => {
    const state = newState();
    const { triggers } = compileTriggers(["done"]);

    assert.strictEqual(
      scanOutput(state, "done", triggers, { cooldownMs: 5000, now: 1_000_000 }),
      "done",
    );
    assert.strictEqual(
      scanOutput(state, "done", triggers, { cooldownMs: 5000, now: 1_001_000 }),
      undefined,
    );
    assert.strictEqual(
      scanOutput(state, "done", triggers, { cooldownMs: 5000, now: 1_005_001 }),
      "done",
    );
  });

  test("scanOutput matches across chunks and strips ANSI codes", () => {
    const state = newState();
    const { triggers } = compileTriggers(["Build successful"]);

    scanOutput(state, "Build ", triggers, { cooldownMs: 5000, now: 1_000_000 });
    const match = scanOutput(state, "\x1b[1msuccessful\x1b[0m", triggers, {
      cooldownMs: 5000,
      now: 1_000_100,
    });

    assert.strictEqual(match, "Build successful");
  });

  test("scanOutput caps the retained buffer", () => {
    const state: TriggerState = {
      buffer: "x".repeat(900),
      lastTriggerTime: 0,
      userTyped: true,
    };
    const { triggers } = compileTriggers(["never matches"]);

    scanOutput(state, "y".repeat(200), triggers, {
      cooldownMs: 5000,
      now: 1_000_000,
    });

    assert.strictEqual(state.buffer.length, BUFFER_LIMIT);
  });

  test("scanOutput suppresses matches until the user types again", () => {
    const state = newState();
    const { triggers } = compileTriggers(["done"]);

    // First trigger fires (the terminal starts with the gate open). scanOutput
    // itself leaves the gate open — the caller closes it when it sends.
    assert.strictEqual(
      scanOutput(state, "done", triggers, {
        cooldownMs: 5000,
        now: 1_000_000,
        requireUserInput: true,
      }),
      "done",
    );
    assert.strictEqual(state.userTyped, true);

    // The caller closes the gate after sending the notification.
    state.userTyped = false;

    // Trigger fires again while the user is idle: consumed, nothing sent.
    assert.strictEqual(
      scanOutput(state, "done", triggers, {
        cooldownMs: 5000,
        now: 1_006_000,
        requireUserInput: true,
      }),
      undefined,
    );
    assert.strictEqual(state.buffer, "");

    // The user types; the next detection fires.
    state.userTyped = true;
    assert.strictEqual(
      scanOutput(state, "done", triggers, {
        cooldownMs: 5000,
        now: 1_007_000,
        requireUserInput: true,
      }),
      "done",
    );
  });

  test("idle matches are consumed even inside the cooldown window", () => {
    const state: TriggerState = {
      buffer: "",
      lastTriggerTime: 1_000_000,
      userTyped: false,
    };
    const { triggers } = compileTriggers(["done"]);

    // Within the cooldown window, but the user is idle: consumed, not deferred,
    // so this stale output can never fire after the user types.
    assert.strictEqual(
      scanOutput(state, "done", triggers, {
        cooldownMs: 5000,
        now: 1_001_000,
        requireUserInput: true,
      }),
      undefined,
    );
    assert.strictEqual(state.buffer, "");

    // A fresh detection after the user types fires once the cooldown passes.
    state.userTyped = true;
    assert.strictEqual(
      scanOutput(state, "done", triggers, {
        cooldownMs: 5000,
        now: 1_005_001,
        requireUserInput: true,
      }),
      "done",
    );
  });

  test("suppressed matches do not advance the cooldown timer", () => {
    const state: TriggerState = {
      buffer: "",
      lastTriggerTime: 1_000_000,
      userTyped: false,
    };
    const { triggers } = compileTriggers(["done"]);

    // Outside the cooldown, but suppressed for lack of user input.
    assert.strictEqual(
      scanOutput(state, "done", triggers, {
        cooldownMs: 5000,
        now: 1_010_000,
        requireUserInput: true,
      }),
      undefined,
    );

    // The cooldown is still measured from the last *sent* notification.
    assert.strictEqual(state.lastTriggerTime, 1_000_000);
  });

  test("scanOutput without requireUserInput ignores the typing gate", () => {
    const state: TriggerState = {
      buffer: "",
      lastTriggerTime: 1_000_000,
      userTyped: false,
    };
    const { triggers } = compileTriggers(["done"]);

    const match = scanOutput(state, "done", triggers, {
      cooldownMs: 5000,
      now: 1_005_001,
    });

    assert.strictEqual(match, "done");
  });
});

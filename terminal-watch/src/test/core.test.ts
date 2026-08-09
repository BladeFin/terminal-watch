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
  return { buffer: "", lastTriggerTime: 0 };
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

    const match = scanOutput(state, "Build successful", triggers, 5000, 1_000_000);

    assert.strictEqual(match, "Build successful");
    assert.strictEqual(state.buffer, "");
    assert.strictEqual(state.lastTriggerTime, 1_000_000);
  });

  test("scanOutput respects the cooldown window", () => {
    const state: TriggerState = { buffer: "", lastTriggerTime: 1_000_000 };
    const { triggers } = compileTriggers(["done"]);

    const match = scanOutput(state, "done", triggers, 5000, 1_001_000);

    assert.strictEqual(match, undefined);
    // Output is kept so a later match can still fire
    assert.strictEqual(state.buffer, "done");
  });

  test("scanOutput fires again once the cooldown elapses", () => {
    const state = newState();
    const { triggers } = compileTriggers(["done"]);

    assert.strictEqual(scanOutput(state, "done", triggers, 5000, 1_000_000), "done");
    assert.strictEqual(scanOutput(state, "done", triggers, 5000, 1_001_000), undefined);
    assert.strictEqual(scanOutput(state, "done", triggers, 5000, 1_005_001), "done");
  });

  test("scanOutput matches across chunks and strips ANSI codes", () => {
    const state = newState();
    const { triggers } = compileTriggers(["Build successful"]);

    scanOutput(state, "Build ", triggers, 5000, 1_000_000);
    const match = scanOutput(state, "\x1b[1msuccessful\x1b[0m", triggers, 5000, 1_000_100);

    assert.strictEqual(match, "Build successful");
  });

  test("scanOutput caps the retained buffer", () => {
    const state: TriggerState = { buffer: "x".repeat(900), lastTriggerTime: 0 };
    const { triggers } = compileTriggers(["never matches"]);

    scanOutput(state, "y".repeat(200), triggers, 5000, 1_000_000);

    assert.strictEqual(state.buffer.length, BUFFER_LIMIT);
  });
});

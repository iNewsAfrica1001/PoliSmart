import test from "node:test";
import assert from "node:assert/strict";
import {
  isPermittedPrelaunchLeadTransition,
  permittedPrelaunchLeadStatuses,
  PRELAUNCH_LEAD_STATUSES,
} from "../shared/prelaunchLeadStatus.js";

const authorized = [
  ["NEW", "CONTACTED"],
  ["NEW", "QUALIFIED"],
  ["NEW", "CLOSED"],
  ["CONTACTED", "QUALIFIED"],
  ["CONTACTED", "CLOSED"],
  ["QUALIFIED", "CLOSED"],
];

test("central policy permits every authorized forward status transition", () => {
  for (const [current, requested] of authorized)
    assert.equal(isPermittedPrelaunchLeadTransition(current, requested), true);
});

test("central policy blocks backward transitions and reopening closed leads", () => {
  const allowed = new Set(authorized.map((pair) => pair.join(":")));
  for (const current of PRELAUNCH_LEAD_STATUSES)
    for (const requested of PRELAUNCH_LEAD_STATUSES)
      if (current !== requested && !allowed.has(`${current}:${requested}`))
        assert.equal(isPermittedPrelaunchLeadTransition(current, requested), false);
  assert.deepEqual(permittedPrelaunchLeadStatuses("CLOSED"), []);
});

test("selecting the current status is an idempotent policy no-op", () => {
  for (const status of PRELAUNCH_LEAD_STATUSES)
    assert.equal(isPermittedPrelaunchLeadTransition(status, status), true);
});

test("unknown, empty, null, undefined, and non-string statuses fail closed", () => {
  const sameObject = {};
  const invalidPairs = [
    ["UNKNOWN", "UNKNOWN"],
    ["UNKNOWN", "NEW"],
    ["NEW", "UNKNOWN"],
    ["", ""],
    [null, null],
    [undefined, undefined],
    [0, 0],
    [false, false],
    [sameObject, sameObject],
  ];
  for (const [current, requested] of invalidPairs)
    assert.doesNotThrow(() => {
      assert.equal(isPermittedPrelaunchLeadTransition(current, requested), false);
    });
});

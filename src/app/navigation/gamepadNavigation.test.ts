import { describe, expect, it } from "vitest";
import { resolvePressState } from "./gamepadNavigation";

function pad(buttons: Record<number, boolean>, axes: number[] = []) {
  const maxIndex = Math.max(0, ...Object.keys(buttons).map(Number));
  const buttonList = Array.from({ length: maxIndex + 1 }, (_, i) => ({ pressed: Boolean(buttons[i]) }));
  return { axes, buttons: buttonList };
}

function padWithHatAxis(value: number) {
  const axes = new Array(10).fill(0);
  axes[9] = value;
  return { axes, buttons: [] };
}

describe("resolvePressState", () => {
  it("returns no presses when no gamepad is connected", () => {
    expect(resolvePressState(undefined)).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
      back: false,
      confirm: false
    });
  });

  it("reads D-pad buttons[12..15] as a fallback for direction", () => {
    expect(resolvePressState(pad({ 12: true }))).toMatchObject({ up: true, down: false, left: false, right: false });
    expect(resolvePressState(pad({ 13: true }))).toMatchObject({ down: true });
    expect(resolvePressState(pad({ 14: true }))).toMatchObject({ left: true });
    expect(resolvePressState(pad({ 15: true }))).toMatchObject({ right: true });
  });

  it("maps button 1 (Enter, buttons[0]) to confirm and button 2 (Backspace, buttons[1]) to back", () => {
    expect(resolvePressState(pad({ 0: true }))).toMatchObject({ confirm: true, back: false });
    expect(resolvePressState(pad({ 1: true }))).toMatchObject({ confirm: false, back: true });
  });

  it("decodes the D-pad hat switch reported on axes[9]", () => {
    expect(resolvePressState(padWithHatAxis(-1))).toMatchObject({ up: true, down: false, left: false, right: false });
    expect(resolvePressState(padWithHatAxis(1 / 7))).toMatchObject({ down: true });
    expect(resolvePressState(padWithHatAxis(5 / 7))).toMatchObject({ left: true });
    expect(resolvePressState(padWithHatAxis(-3 / 7))).toMatchObject({ right: true });
  });

  it("treats a centered/unrecognized hat axis value as no direction", () => {
    expect(resolvePressState(padWithHatAxis(0))).toMatchObject({ up: false, down: false, left: false, right: false });
  });

  it("does not read the analog rudder axes (0-3) as navigation input", () => {
    const rudderPad = { axes: [0.9, -0.9, 0.9, -0.9], buttons: [] };
    expect(resolvePressState(rudderPad)).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
      back: false,
      confirm: false
    });
  });
});

import { describe, expect, it } from "vitest";
import { resolvePressState } from "./gamepadNavigation";

function pad(buttons: Record<number, boolean>, axes: number[] = [0, 0]) {
  const maxIndex = Math.max(0, ...Object.keys(buttons).map(Number));
  const buttonList = Array.from({ length: maxIndex + 1 }, (_, i) => ({ pressed: Boolean(buttons[i]) }));
  return { axes, buttons: buttonList };
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

  it("reads D-pad buttons for direction", () => {
    expect(resolvePressState(pad({ 12: true }))).toMatchObject({ up: true, down: false, left: false, right: false });
    expect(resolvePressState(pad({ 13: true }))).toMatchObject({ down: true });
    expect(resolvePressState(pad({ 14: true }))).toMatchObject({ left: true });
    expect(resolvePressState(pad({ 15: true }))).toMatchObject({ right: true });
  });

  it("maps button 0 (Cross/X) to back and button 1 (Circle/O) to confirm", () => {
    expect(resolvePressState(pad({ 0: true }))).toMatchObject({ back: true, confirm: false });
    expect(resolvePressState(pad({ 1: true }))).toMatchObject({ back: false, confirm: true });
  });

  it("falls back to the left stick past the deadzone when the D-pad is idle", () => {
    expect(resolvePressState(pad({}, [0, -0.9]))).toMatchObject({ up: true, down: false });
    expect(resolvePressState(pad({}, [0, 0.9]))).toMatchObject({ down: true });
    expect(resolvePressState(pad({}, [-0.9, 0]))).toMatchObject({ left: true });
    expect(resolvePressState(pad({}, [0.9, 0]))).toMatchObject({ right: true });
    expect(resolvePressState(pad({}, [0.1, -0.1]))).toMatchObject({ up: false, down: false, left: false, right: false });
  });
});

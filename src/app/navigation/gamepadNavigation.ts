import { useEffect, useRef } from "react";

// Mapping per the "Sailing Tactics Rudder" BLE gamepad firmware spec:
// - Button 1 (Enter/OK) is buttons[0], Button 2 (Backspace/Back) is buttons[1]
//   (the firmware doc numbers buttons 1-based; the Gamepad API is 0-based).
// - Buttons 3-10 (buttons[2..9]) are per-rudder left/right nudge commands for
//   players without an analog Chain Angle module — unrelated to menu
//   navigation, intentionally not read here.
// - axes[0..3] (X/Y/Z/Rx) are the four analog rudder channels, NOT a
//   navigation stick — reading them for menu direction would misfire
//   whenever a rudder sits off-center, so direction comes from the D-pad
//   only.
// - The D-pad is a HID hat switch. The firmware doc says browsers commonly
//   expose it as a single axis (often axes[9]) rather than four buttons; a
//   buttons[12..15] fallback is kept in case a given browser's "standard"
//   gamepad remapping normalizes it into dedicated D-pad buttons instead.
const BUTTON_CONFIRM = 0;
const BUTTON_BACK = 1;
const DPAD_BUTTON_UP = 12;
const DPAD_BUTTON_DOWN = 13;
const DPAD_BUTTON_LEFT = 14;
const DPAD_BUTTON_RIGHT = 15;
const DPAD_HAT_AXIS_INDEX = 9;

export type NavigationPressState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  back: boolean;
  confirm: boolean;
};

const NO_PRESS: NavigationPressState = { up: false, down: false, left: false, right: false, back: false, confirm: false };

/**
 * A HID hat switch normalized onto a single Gamepad axis conventionally
 * reports one of 8 evenly-spaced values across [-1, 1], clockwise starting
 * at "up" (up, up-right, right, down-right, down, down-left, left, up-left).
 * Diagonals aren't currently mapped to a direction here — this project's
 * menus only need the 4 cardinal ones. This exact encoding is a best-effort
 * per common convention and has NOT been verified against the real
 * controller yet: if it turns out wrong, log `gamepad.axes` while pressing
 * each D-pad direction and adjust these reference values and/or
 * DPAD_HAT_AXIS_INDEX accordingly.
 */
const HAT_AXIS_DIRECTIONS: { value: number; direction: "up" | "down" | "left" | "right" }[] = [
  { value: -1, direction: "up" },
  { value: -3 / 7, direction: "right" },
  { value: 1 / 7, direction: "down" },
  { value: 5 / 7, direction: "left" }
];
const HAT_AXIS_TOLERANCE = 1 / 14;

function directionFromHatAxis(value: number | undefined): "up" | "down" | "left" | "right" | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  const match = HAT_AXIS_DIRECTIONS.find((entry) => Math.abs(entry.value - value) <= HAT_AXIS_TOLERANCE);
  return match?.direction;
}

type MinimalGamepad = {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
};

/** Pure so it can be unit-tested without a real Gamepad object. */
export function resolvePressState(pad: MinimalGamepad | undefined): NavigationPressState {
  if (!pad) return NO_PRESS;

  const hatDirection = directionFromHatAxis(pad.axes[DPAD_HAT_AXIS_INDEX]);

  return {
    up: Boolean(pad.buttons[DPAD_BUTTON_UP]?.pressed) || hatDirection === "up",
    down: Boolean(pad.buttons[DPAD_BUTTON_DOWN]?.pressed) || hatDirection === "down",
    left: Boolean(pad.buttons[DPAD_BUTTON_LEFT]?.pressed) || hatDirection === "left",
    right: Boolean(pad.buttons[DPAD_BUTTON_RIGHT]?.pressed) || hatDirection === "right",
    back: Boolean(pad.buttons[BUTTON_BACK]?.pressed),
    confirm: Boolean(pad.buttons[BUTTON_CONFIRM]?.pressed)
  };
}

const DIRECTION_KEYS: Record<"up" | "down" | "left" | "right", string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight"
};

function dispatchKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

/**
 * Bridges a connected gamepad's D-pad and Enter/Backspace buttons into the
 * app's navigation: directions and confirm are re-dispatched as synthetic
 * ArrowUp/Down/Left/Right/Enter keydown events, which is exactly what
 * norigin-spatial-navigation already listens for on `window` — so focus
 * movement and "confirm the focused button" reuse the same code path as a
 * real keyboard (the two sources feed the same pipe, they don't compete).
 * Back is handled separately via `onBack`, since going back is app-level
 * routing, not focus movement.
 */
export function useDpadGamepadNavigation(onBack: () => void) {
  const previousRef = useRef<NavigationPressState>(NO_PRESS);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    let frame = 0;

    const poll = () => {
      const gamepads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(gamepads).find((item): item is Gamepad => Boolean(item?.connected));
      const pressed = resolvePressState(pad);
      const previous = previousRef.current;

      (Object.keys(pressed) as Array<keyof NavigationPressState>).forEach((key) => {
        if (!pressed[key] || previous[key]) return;
        if (key === "back") onBackRef.current();
        else if (key === "confirm") dispatchKey("Enter");
        else dispatchKey(DIRECTION_KEYS[key]);
      });

      previousRef.current = pressed;
      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);
}

import { useEffect, useRef } from "react";

// Standard Gamepad API mapping (https://w3c.github.io/gamepad/#remapping):
// buttons[12..15] = D-pad Up/Down/Left/Right, buttons[0] = bottom face button
// (Xbox A / PlayStation Cross), buttons[1] = right face button (Xbox B /
// PlayStation Circle). This project's controller maps Cross(X) to "back" and
// Circle(O) to "confirm" — the reverse of the Western PlayStation convention,
// matching how the team's hardware remote is labeled.
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;
const BUTTON_BACK = 0;
const BUTTON_CONFIRM = 1;
const STICK_DEADZONE = 0.5;

export type NavigationPressState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  back: boolean;
  confirm: boolean;
};

const NO_PRESS: NavigationPressState = { up: false, down: false, left: false, right: false, back: false, confirm: false };

type MinimalGamepad = {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
};

/** Pure so it can be unit-tested without a real Gamepad object. */
export function resolvePressState(pad: MinimalGamepad | undefined): NavigationPressState {
  if (!pad) return NO_PRESS;

  const axisX = pad.axes[0] ?? 0;
  const axisY = pad.axes[1] ?? 0;

  return {
    up: Boolean(pad.buttons[DPAD_UP]?.pressed) || axisY < -STICK_DEADZONE,
    down: Boolean(pad.buttons[DPAD_DOWN]?.pressed) || axisY > STICK_DEADZONE,
    left: Boolean(pad.buttons[DPAD_LEFT]?.pressed) || axisX < -STICK_DEADZONE,
    right: Boolean(pad.buttons[DPAD_RIGHT]?.pressed) || axisX > STICK_DEADZONE,
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
 * Bridges a connected gamepad's D-pad/left-stick and Cross/Circle buttons
 * into the app's navigation: directions and Circle(confirm) are re-dispatched
 * as synthetic ArrowUp/Down/Left/Right/Enter keydown events, which is exactly
 * what norigin-spatial-navigation already listens for on `window` — so focus
 * movement and "confirm the focused button" reuse the same code path as a
 * real keyboard. Cross(back) is handled separately via `onBack`, since
 * going back is app-level routing, not focus movement.
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

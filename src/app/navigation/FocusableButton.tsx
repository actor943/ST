import type { ButtonHTMLAttributes } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

type FocusableButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: () => void;
};

/**
 * Drop-in replacement for <button> that participates in D-pad/arrow-key
 * spatial navigation. Mouse/touch clicks keep working exactly as before;
 * this only adds keyboard/gamepad focus movement and a `.tv-focused` class
 * for the on-screen cursor highlight.
 */
export function FocusableButton({ className, onClick, disabled, children, ...rest }: FocusableButtonProps) {
  const { ref, focused } = useFocusable<object, HTMLButtonElement>({
    focusable: !disabled,
    onEnterPress: () => onClick?.()
  });

  return (
    <button
      {...rest}
      ref={ref}
      disabled={disabled}
      className={[className, focused ? "tv-focused" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

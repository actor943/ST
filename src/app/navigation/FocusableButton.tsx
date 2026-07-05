import { useEffect } from "react";
import type { ButtonHTMLAttributes } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

type FocusableButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: () => void;
  /**
   * Claim the initial D-pad/arrow-key cursor position when this button
   * mounts. norigin-spatial-navigation never picks a default focus on its
   * own — without exactly one `autoFocus` button per screen, arrow keys have
   * no "currently focused" component to move from and silently do nothing.
   */
  autoFocus?: boolean;
};

/**
 * Drop-in replacement for <button> that participates in D-pad/arrow-key
 * spatial navigation. Mouse/touch clicks keep working exactly as before;
 * this only adds keyboard/gamepad focus movement and a `.tv-focused` class
 * for the on-screen cursor highlight.
 */
export function FocusableButton({ className, onClick, disabled, children, autoFocus, ...rest }: FocusableButtonProps) {
  const { ref, focused, focusSelf } = useFocusable<object, HTMLButtonElement>({
    focusable: !disabled,
    onEnterPress: () => onClick?.()
  });

  useEffect(() => {
    if (autoFocus) focusSelf();
  }, [autoFocus, focusSelf]);

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

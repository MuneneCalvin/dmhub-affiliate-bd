import * as React from 'react';

type FocusHandler = (event: Event) => void;

/**
 * Radix overlays return focus to their `*Trigger` on close. Most of our
 * dialogs and sheets are opened from state (a row button, a menu item) with no
 * trigger, so focus fell back to `<body>`. Spread the returned handlers on an
 * overlay's Content: it remembers the element focused when the overlay opened
 * and focuses it again on close, falling back to Radix's behaviour when that
 * element is gone (e.g. a closed menu item).
 */
export function useRestoreFocus({
    onOpenAutoFocus,
    onCloseAutoFocus,
}: {
    onOpenAutoFocus?: FocusHandler;
    onCloseAutoFocus?: FocusHandler;
}) {
    const opener = React.useRef<HTMLElement | null>(null);

    return {
        // Radix fires this before it moves focus into the overlay, so the
        // active element is still the one that opened it.
        onOpenAutoFocus: (event: Event) => {
            const active = document.activeElement;
            opener.current =
                active instanceof HTMLElement && active !== document.body
                    ? active
                    : null;
            onOpenAutoFocus?.(event);
        },
        onCloseAutoFocus: (event: Event) => {
            onCloseAutoFocus?.(event);
            if (event.defaultPrevented) return;
            const element = opener.current;
            opener.current = null;
            if (element?.isConnected) {
                event.preventDefault();
                element.focus({ preventScroll: true });
            }
        },
    };
}

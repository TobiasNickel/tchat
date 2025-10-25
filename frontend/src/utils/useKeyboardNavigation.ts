import { useEffect, useRef, useCallback } from "react";

export interface KeyboardNavigationOptions {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
  requireCtrl?: boolean;
}

/**
 * Custom hook for handling keyboard navigation in components
 * Supports Ctrl + Arrow keys for navigation to avoid conflicts with text input
 */
export function useKeyboardNavigation(
  options: KeyboardNavigationOptions,
  deps: React.DependencyList = []
) {
  const elementRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!options.enabled) return;
    
    // Check if Ctrl key is required and pressed (or not required)
    if (options.requireCtrl) {
      if (!event.ctrlKey) return;
    }

    switch (event.key) {
      case "ArrowUp":
        if (options.onMoveUp) {
          event.preventDefault();
          options.onMoveUp();
        }
        break;
      case "ArrowDown":
        if (options.onMoveDown) {
          event.preventDefault();
          options.onMoveDown();
        }
        break;
      case "ArrowLeft":
        if (options.onMoveLeft) {
          event.preventDefault();
          options.onMoveLeft();
        }
        break;
      case "ArrowRight":
        if (options.onMoveRight) {
          event.preventDefault();
          options.onMoveRight();
        }
        break;
      case "Enter":
        if (options.onEnter) {
          event.preventDefault();
          options.onEnter();
        }
        break;
      case "Escape":
        if (options.onEscape) {
          event.preventDefault();
          options.onEscape();
        }
        break;
    }
  }, [options, ...deps]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("keydown", handleKeyDown);
    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return elementRef;
}
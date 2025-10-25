import { useEffect } from "react";
import { throttle } from "underscore";

interface ResizeCallback {
  (): void;
}

export function useResizeObserver<T extends Element>(ref: React.RefObject<T>, callback: ResizeCallback): void {
  useEffect(() => {
    if (ref.current) {
      const throttledCallback = throttle(callback, 200);
      const resizeObserver = new ResizeObserver(() => {
        throttledCallback();
      });

      resizeObserver.observe(ref.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [ref, callback]);
}

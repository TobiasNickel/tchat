import { useEffect, useState } from 'react'

export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export function useElementWidth(ref: React.MutableRefObject<HTMLElement | null>, defaultWidth: number = window.innerWidth) {
  const [width, setWidth] = useState(defaultWidth);
  useEffect(() => {
    if (ref.current) {
      console.log('useElementWith', ref.current)
      const handleResize = () => {
        const element = ref.current
        element&&console.log('setWidth', element)
        element && setWidth(element.offsetWidth)
      };
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize)
      };
    }
  }, [ref.current])
  return width
}

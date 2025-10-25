import React from 'react'

export function useDraggableScroll(ref: React.RefObject<HTMLDivElement>, direction: 'horizontal' | 'vertical' = 'horizontal') {
  let scrollStartX = 0
  let scrollStartY = 0
  let isDragging = false

  const onMouseDown = (e: React.MouseEvent) => {
    if (ref.current) {
      ref.current.style.cursor = 'grabbing'
      isDragging = true
      scrollStartX = e.pageX - ref.current.offsetLeft
      scrollStartY = e.pageY - ref.current.offsetTop
    }
  }

  const onMouseUp = (e: MouseEvent) => {
    if (ref.current) {
      ref.current.style.cursor = 'grab'
      isDragging = false
      e.stopPropagation()
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (ref.current && ref.current.style.cursor === 'grabbing') {
      if (!isDragging) return
      e.preventDefault()
      const x = e.pageX - ref.current.offsetLeft
      const y = e.pageY - ref.current.offsetTop
      const walkX = x - scrollStartX
      const walkY = y - scrollStartY

      if (direction === 'horizontal') {
        ref.current.scrollLeft -= walkX
      } else if (direction === 'vertical') {
        ref.current.scrollTop -= walkY
      }

      scrollStartX = x
      scrollStartY = y
    }
  }

  const onMouseLeave = () => {
    if (ref.current) {
      ref.current.style.cursor = 'grab'
    }
  }

  const events = {
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseLeave,
  }

  return events
}

export function useIsOverFlowing(ref: React.RefObject<HTMLDivElement>, direction: 'horizontal' | 'vertical' = 'horizontal') {
  const [isOverflowing, setIsOverflowing] = React.useState(false)

  React.useEffect(() => {
    const checkOverflow = () => {
      if (ref.current) {
        if (direction === 'horizontal') {
          setIsOverflowing(ref.current.scrollWidth > ref.current.clientWidth)
        } else if (direction === 'vertical') {
          setIsOverflowing(ref.current.scrollHeight > ref.current.clientHeight)
        }
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)

    return () => {
      window.removeEventListener('resize', checkOverflow)
    }
  }, [ref, direction])

  return isOverflowing
}

import React, { Suspense } from 'react'
import type { ComponentType } from 'react'

export function lazyModule<T>(factory: () => Promise<T>, name: keyof T, fallback?: React.ReactNode) {
  const LazyComponent = React.lazy(() => factory().then(module => ({ default: module[name] as ComponentType<any> })))
  return (props: any) => {
    return (
      <Suspense fallback={fallback ? fallback : (
        <div className="flex items-center justify-center h-full">
          <div className="loader"></div>
        </div>
      )}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

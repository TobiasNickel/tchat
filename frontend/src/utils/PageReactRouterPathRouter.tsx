/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { makeAtom, useAtom } from './atom'
import type { TQuery } from './toQueryString'
import { config } from '@/config';

export type CurrentRouteAtomType = {
  route: string;
  properties: Record<string, string>;
  queryParams: TQuery;
}

export const currentRouteAtom = makeAtom<CurrentRouteAtomType, Record<string, string>>({ route: '/', properties: {} as Record<string, string>, queryParams: {} as Record<string, string> }, {}, 'currentRoute')
export const useCurrentRoute = () => useAtom(currentRouteAtom)
export function currentRoute() {
  return currentRouteAtom.state.route
}

// Custom router state
let routerConfig = {
  basePath: '',
  routes: [] as Array<{ path: string, handler: (params: Record<string, string>, query: Record<string, string>) => void }>,
  isStarted: false
}

export function navigateTo(path: string) {
  if (!path) {
    return
  }
  console.log('navigateTo:', path)
  
  // Update browser history
  if (typeof window !== 'undefined') {
    window.history.pushState(null, '', config.basePath + path)
    handleRouteChange()
  }
}

// Route matching logic
function matchRoute(routePath: string, currentPath: string): { match: boolean, params: Record<string, string> } {
  // Handle exact matches first
  if (routePath === currentPath) {
    return { match: true, params: {} }
  }

  // Convert route path to regex and extract parameters
  const paramNames: string[] = []
  const regexPattern = routePath
    .replace(/:\w+/g, (match) => {
      paramNames.push(match.slice(1)) // Remove the ':' prefix
      return '([^/]+)'
    })
    .replace(/\*/g, '(.*)')

  const regex = new RegExp(`^${regexPattern}$`)
  const match = currentPath.match(regex)

  if (match) {
    const params: Record<string, string> = {}
    paramNames.forEach((name, index) => {
      const value = match[index + 1]
      if (value !== undefined) {
        params[name] = value
      }
    })
    return { match: true, params }
  }

  return { match: false, params: {} }
}

function handleRouteChange() {
  if (!routerConfig.isStarted) return

  const fullPath = window.location.pathname + window.location.search
  let pathname = window.location.pathname
  let queryString = window.location.search

  // Remove basePath from pathname if it exists
  if (routerConfig.basePath && routerConfig.basePath !== '/') {
    if (pathname.startsWith(routerConfig.basePath)) {
      pathname = pathname.slice(routerConfig.basePath.length)
    }
  }

  // Ensure we always have a leading slash
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname
  }
  pathname = pathname || '/'

  // console.log('handleRouteChange:', { fullPath, pathname, basePath: routerConfig.basePath })

  // Parse query parameters
  const queryParams = parseQuery(queryString)

  // Find matching route
  for (const route of routerConfig.routes) {
    const { match, params } = matchRoute(route.path, pathname)
    if (match) {
      // console.log('ROUTE MATCHED:', route.path, 'navigated to', fullPath, params)
      route.handler(params, queryParams)
      return
    }
  }

  // No route matched - this should show 404 or default route
  // console.log('No route matched for:', pathname)
}

// Initialize router
function startRouter(basePath: string) {
  if (routerConfig.isStarted) {
    stopRouter()
  }

  routerConfig.basePath = basePath
  routerConfig.isStarted = true

  if (typeof window !== 'undefined') {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleRouteChange)
    
    // Handle initial route
    handleRouteChange()
  }

  console.log('started custom router with basePath', JSON.stringify(basePath))
}

function stopRouter() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', handleRouteChange)
  }
  routerConfig.isStarted = false
  routerConfig.routes = []
}

function addRoute(path: string, handler: (params: Record<string, string>, query: Record<string, string>) => void) {
  routerConfig.routes.push({ path, handler })
}

export function Link({ to, children, className, active, disabled, style={} }: { to: string, children: any, className?: string, active?: boolean, disabled?: boolean, style?: React.CSSProperties }) {
  const { route } = useCurrentRoute()
  const isActive = active || (route === to)
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      console.log('Link clicked:', to)
      navigateTo(to)
    }
  }

  return <div onClick={handleClick} className={(className || '') + (isActive ? ' active' : '') + ' link-cursor'} style={{ cursor: 'pointer', ...style }}>{children}</div>
}

export type PageRoute = {
  path: string
  properties?: Record<string, string>
  element: any
}

export function PageReactRouter({ routes, basePath }: { routes: PageRoute[], basePath?: string }) {
  // Normalize basePath - remove trailing slash, default to empty string for root
  const normalizedBasePath = basePath ? (basePath.endsWith('/') && basePath !== '/' ? basePath.slice(0, -1) : basePath) : ''
  const [currentRoute, setCurrentRoute] = useState<PageRoute>({ path: '', element: <>404</> })
  
  useEffect(() => {
    // Stop any existing router
    stopRouter()
    
    let routing = 0.1
    routes.forEach((route) => {
      const properties = route.properties || {}
      // console.log('registering route', route.path, 'with basePath:', normalizedBasePath, properties)
      
      addRoute(route.path, (params, queryParams) => {
        // Calculate the route relative to basePath
        let relativePath = window.location.pathname
        if (normalizedBasePath && normalizedBasePath !== '/') {
          relativePath = relativePath.slice(normalizedBasePath.length)
        }
        // Ensure we always have a leading slash for consistent route matching
        if (relativePath && !relativePath.startsWith('/')) {
          relativePath = '/' + relativePath
        }
        relativePath = relativePath || '/'
        
        console.log('calculated relativePath:', relativePath, 'from pathname:', window.location.pathname, 'with basePath:', normalizedBasePath)
        
        currentRouteAtom.set({
          route: relativePath,
          properties: { ...params, ...properties },
          queryParams
        }, false)

        const thisRouting = routing = setTimeout(() => {
          if (routing !== thisRouting) {
            return
          }
          setCurrentRoute(route)
        }, 0) as any as number
      })
    })
    
    // Start the router
    startRouter(normalizedBasePath || '/')
    
    return () => {
      stopRouter()
    }
  }, [routes, normalizedBasePath])
  
  return currentRoute.element
}

function parseQuery(queryString: string) {
  if (!queryString) {
    return {}
  }
  if (queryString.startsWith('?')) {
    queryString = queryString.substring(1)
  }
  const query: Record<string, string> = {}
  queryString.split('&').forEach((pair) => {
    const [key='', value=''] = pair.split('=')
    query[key] = value
  })
  return query
}

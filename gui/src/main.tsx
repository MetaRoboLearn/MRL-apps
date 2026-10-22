import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Import the query client
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

// Create a new query client instance
const queryClient = new QueryClient()

// Create a new router instance with context
const router = createRouter({
  routeTree,
  context: { queryClient, },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface RouteContext {
    queryClient: QueryClient
  }
  interface StaticDataRouteOption {
    mode?: 'solve' | 'edit' | 'create'
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
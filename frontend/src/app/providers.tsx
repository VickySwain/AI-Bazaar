'use client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 401 || error?.response?.status === 403) return false
              return failureCount < 2
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'DM Sans, system-ui, sans-serif',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#34d399', secondary: '#1e293b' },
            duration: 3000,
          },
          error: {
            iconTheme: { primary: '#fb7185', secondary: '#1e293b' },
            duration: 4000,
          },
        }}
      />
    </QueryClientProvider>
  )
}

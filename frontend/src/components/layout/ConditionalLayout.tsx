'use client'
import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/profile') ||
    pathname.startsWith('/recommend') ||
    pathname.startsWith('/compare')
  
  return (
    <>
      {!isDashboard && <Navbar />}
      <main className="min-h-screen">{children}</main>
      {!isDashboard && <Footer />}
    </>
  )
}
import './globals.css'
import type { ReactNode } from 'react'
import { RevenueCatProvider } from '../components/RevenueCatProvider'

export const metadata = {
  title: 'Futura',
  description: 'Futura placeholder frontend'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RevenueCatProvider />
        {children}
      </body>
    </html>
  )
}

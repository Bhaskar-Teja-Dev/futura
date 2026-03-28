import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Futura',
  description: 'Futura — Smart financial planning powered by Zens'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}

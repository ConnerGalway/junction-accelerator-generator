import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Junction Editor | eLearningU Accelerator',
  description: 'Visual content editor for accelerator implementation plans',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "'Open Sans', system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  )
}

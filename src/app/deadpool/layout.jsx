import { Cinzel } from 'next/font/google'
import '../globals.css'

// Inscriptional Roman caps — echoes the carved-stone look of the masthead
// wordmark without competing with its blackletter, and stays readable at
// small sizes where blackletter wouldn't.
const displayFont = Cinzel({
  subsets: ['latin'],
  variable: '--font-deadpool-display',
  display: 'swap',
})

export const metadata = {
  title: 'Kleimeyer.com',
  robots: 'noindex, nofollow',
}

export default function DeadpoolLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${displayFont.variable}`}>
      <body className="h-full bg-black">
        {children}
      </body>
    </html>
  )
}

import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import SignInForm from '@/apps/deadpool/components/SignInForm'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Sign In',
  robots: 'noindex, nofollow',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-md px-4 py-10">
        <PageHeader title="Sign In" subtitle="Welcome back. Just your email — no code needed." />
        <SignInForm />
      </div>
    </div>
  )
}

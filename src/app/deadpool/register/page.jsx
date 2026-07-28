import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import RegisterForm from '@/apps/deadpool/components/RegisterForm'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Register',
  robots: 'noindex, nofollow',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-md px-4 py-10">
        <PageHeader
          title="Join the Pool"
          subtitle="You'll need the registration code the commissioner sent you."
        />
        <RegisterForm />
      </div>
    </div>
  )
}

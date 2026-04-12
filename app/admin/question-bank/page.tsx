import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getQuestionBank } from '@/lib/data'
import { redirect } from 'next/navigation'
import { QuestionBankClient } from './QuestionBankClient'

export default async function QuestionBankPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) redirect('/admin/dashboard')

  const questions = await getQuestionBank(profile.company_id)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Soru Havuzu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mülakatlarda adaylara sorulacak soruları buradan yönetin. İlan oluştururken bu havuzdan seçim yapabilirsiniz.
        </p>
      </div>
      <QuestionBankClient companyId={profile.company_id} questions={questions} />
    </div>
  )
}

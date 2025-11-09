import { getQuoteRequirements } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import QuoteFormClient from './quote-form-client' 

export default async function QuotesPage() {
    // 1. Verificar autenticação
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect('/login') 
    }

    // 2. Buscar dados necessários (Clientes e Produtos)
    const initialData = await getQuoteRequirements()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Novo Orçamento</h1>
                <p className="text-muted-foreground">Crie um novo orçamento de locação, verifique a disponibilidade de itens e finalize para um cliente.</p>
            </div>
            
            <QuoteFormClient initialData={initialData} />
            
            {/* Futuramente: Listagem de Orçamentos Existentes */}
        </div>
    )
}

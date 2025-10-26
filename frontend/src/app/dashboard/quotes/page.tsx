// src/app/dashboard/quotes/page.tsx

import { getQuoteRequirements } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Importa o componente de Cliente que criamos
import QuoteFormClient from './quote-form-client' 

// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================

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
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold mb-6">Novo Orçamento de Locação</h1>

            {/* O formulário inteiro é um Client Component para gerenciar o estado */}
            <QuoteFormClient initialData={initialData} />
            
            {/* Futuramente: Listagem de Orçamentos Existentes (ListQuotesComponent) */}
        </div>
    )
}
// src/app/dashboard/clients/page.tsx

import { getClients } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

// Componente de Cliente
import ClientFormClient from './client-form-client' 

// Tipagem: Obter o tipo da nossa tabela de clientes
type ClientRow = Database['public']['Tables']['clients']['Row']


// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================

export default async function ClientsPage() {
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
    
    // O RLS (Fase 3) garante que apenas usuários com permissão possam ler
    const clients = await getClients() as ClientRow[]

    // Usaremos classes Tailwind simples (sem shadcn/ui ainda)
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">Gestão de Clientes (CRM)</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna do Formulário de Cadastro */}
                <div className="md:col-span-1">
                    <ClientFormClient />
                </div>
                
                {/* Coluna da Listagem de Clientes */}
                <div className="md:col-span-2">
                    <h2 className="text-xl font-bold mb-4">Clientes Cadastrados ({clients.length})</h2>
                    <div className="space-y-3">
                        {clients.length === 0 ? (
                            <p className="text-gray-500">Nenhum cliente encontrado.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 bg-white text-black">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desde</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {clients.map((c) => (
                                            <tr key={c.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.document}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.email}</td>
                                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {/* Verifica se c.created_at existe antes de formatar */}
                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
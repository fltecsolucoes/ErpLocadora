
// src/app/dashboard/orders/page.tsx (FINAL CORRIGIDO)

import { getOrders, getQuotesForConversion, convertToOS } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
// Adicione esta linha junto aos outros imports
import ConversionButtonClient from './conversion-button-client';
import { Database } from '@/lib/database.types'

// 1. TIPAGEM CORRIGIDA: Usamos 'type' para garantir a sintaxe correta com '| null'
type ClientName = { name: string } | null; 

// Tipagem para a tabela de Orçamentos (já que estamos usando string para IDs)
type QuoteData = {
    id: string; 
    created_at: string;
    status: string;
    client: ClientName;
};

// Tipagem para a tabela de Ordens de Serviço (OS)
type OrderData = {
    id: string; 
    created_at: string;
    status: string;
    type: string;
    client: ClientName;
};




// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================

export default async function OrdersPage() {
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

    // 2. Busca de Dados (Execução em paralelo)
    const [orders, quotes] = await Promise.all([
        getOrders() as OrderData[],
        getQuotesForConversion() as QuoteData[]
    ])
    
    // 3. Helper para Estilização de Status
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Reserved': return 'bg-yellow-200 text-yellow-800';
            case 'CheckedOut': return 'bg-red-200 text-red-800';
            case 'CheckedIn': return 'bg-green-200 text-green-800';
            case 'Draft': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    }


    return (
        <div className="p-8 space-y-10">
            <h1 className="text-3xl font-bold">Gerenciamento de Ordens de Serviço (OS)</h1>

            {/* ------------------------------------------- */}
            {/* SEÇÃO 1: CONVERSÃO DE ORÇAMENTOS */}
            {/* ------------------------------------------- */}
            <div className="border p-6 rounded-lg shadow-md bg-white text-black">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Orçamentos Prontos para Conversão</h2>
                
                {quotes.length === 0 ? (
                    <p className="text-gray-500">Nenhum orçamento em rascunho encontrado.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Cliente</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Data Criação</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {quotes.map((q) => (
                                    <tr key={q.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{q.id.substring(0, 8)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{(q.client as ClientName)?.name || 'N/A'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(q.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            <ConversionButtonClient quoteId={q.id} /> 
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ------------------------------------------- */}
            {/* SEÇÃO 2: LISTAGEM DE ORDENS DE SERVIÇO ATIVAS */}
            {/* ------------------------------------------- */}
            <div className="border p-6 rounded-lg shadow-md bg-white text-black">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Ordens de Serviço Ativas</h2>
                
                {orders.length === 0 ? (
                    <p className="text-gray-500">Nenhuma OS ativa encontrada.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium">#OS</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Tipo</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Cliente</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Data Criação</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {orders.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{o.id.substring(0, 8)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{o.type}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{(o.client as ClientName)?.name || 'N/A'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(o.status)}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {/* Futuro: Botão de Detalhes ou Check-in/Check-out */}
                                            <button className="text-indigo-600 hover:text-indigo-900 text-xs">Detalhes</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
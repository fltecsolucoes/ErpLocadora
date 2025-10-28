// src/app/dashboard/orders/page.tsx (REFEITO E CORRIGIDO)

import { getOrders, getQuotesForConversion, convertToOS } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link';
import ConversionButtonClient from './conversion-button-client'; // Importa o botão separado

// --- TIPAGENS (Correspondem aos tipos de retorno das actions) ---
type QuoteData = {
    id: string; 
    created_at: string;
    status: string;
    client: { name: string }[] | null; // client é array
};

type OrderData = {
    id: string; 
    created_at: string | null; // Pode ser nulo
    status: string | null;     // Pode ser nulo
    type: string | null;       // Pode ser nulo
    client: { name: string }[] | null; // client é array
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
    // Os casts 'as unknown as ...' são removidos aqui, pois as actions já retornam os tipos corretos
    const [orders, quotes] = await Promise.all([
        getOrders(),
        getQuotesForConversion()
    ])
    
    // 3. Helper para Estilização de Status
    const getStatusStyle = (status: string | null) => { // Aceita null
        switch (status) {
            case 'Reserved': return 'bg-yellow-100 text-yellow-800';
            case 'CheckedOut': return 'bg-red-100 text-red-800';
            case 'CheckedIn': return 'bg-green-100 text-green-800';
            case 'Draft': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div className="p-8 space-y-10 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800">Gerenciamento de Ordens de Serviço (OS)</h1>

            {/* SEÇÃO 1: CONVERSÃO DE ORÇAMENTOS */}
            <div className="border p-6 rounded-lg shadow-md bg-white text-black">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Orçamentos Prontos para Conversão</h2>
                {quotes.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum orçamento em rascunho encontrado.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">ID</th>
                                    <th className="px-3 py-2 text-left font-medium">Cliente</th>
                                    <th className="px-3 py-2 text-left font-medium">Data Criação</th>
                                    <th className="px-3 py-2 text-left font-medium">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {quotes.map((q) => (
                                    <tr key={q.id}>
                                        <td className="px-3 py-2">{q.id.substring(0, 8)}</td>
                                        {/* CORREÇÃO: Acessa client como array */}
                                        <td className="px-3 py-2 font-medium">{q.client?.[0]?.name || 'N/A'}</td>
                                        <td className="px-3 py-2 text-gray-500">
                                            {q.created_at ? new Date(q.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <ConversionButtonClient quoteId={q.id} /> 
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SEÇÃO 2: LISTAGEM DE ORDENS DE SERVIÇO ATIVAS */}
            <div className="border p-6 rounded-lg shadow-md bg-white text-black">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Ordens de Serviço Ativas</h2>
                {orders.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma OS ativa encontrada.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">#OS</th>
                                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                                    <th className="px-3 py-2 text-left font-medium">Cliente</th>
                                    <th className="px-3 py-2 text-left font-medium">Status</th>
                                    <th className="px-3 py-2 text-left font-medium">Data Criação</th>
                                    <th className="px-3 py-2 text-left font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {orders.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-3 py-2">{o.id.substring(0, 8)}</td>
                                        <td className="px-3 py-2">{o.type || 'N/A'}</td>
                                        {/* CORREÇÃO: Acessa client como array */}
                                        <td className="px-3 py-2 font-medium">{o.client?.[0]?.name || 'N/A'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 inline-flex leading-4 font-semibold rounded-full ${getStatusStyle(o.status)}`}>
                                                {o.status || 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-500">
                                            {/* CORREÇÃO: Trata created_at nulo */}
                                            {o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Link href={`/dashboard/orders/${o.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                Detalhes
                                            </Link>
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
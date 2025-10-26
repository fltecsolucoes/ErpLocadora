// src/app/dashboard/orders/[orderId]/page.tsx

import { getOrderDetails, type OrderDetails } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Importa o componente cliente dos botões
import StatusButtonsClient from './status-buttons-client'

// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================

// A prop 'params' contém os parâmetros da URL (neste caso, { orderId: '...' })
export default async function OrderDetailsPage({ params }: { params: { orderId: string } }) {
    const orderId = params.orderId;

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

    // 2. Buscar Detalhes da OS específica
    const order = await getOrderDetails(orderId);

    if (!order) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Ordem de Serviço não encontrada.</h1>
                {/* Adicionar link para voltar */}
            </div>
        )
    }

    // 3. Helper para Estilização de Status (igual ao da listagem)
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
        <div className="p-8 space-y-6">
            {/* CABEÇALHO DA OS */}
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold">Detalhes da OS #{order.id.substring(0, 8)}</h1>
                    <p className="text-gray-500">Criada em: {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusStyle(order.status)}`}>
                    Status: {order.status}
                </span>
            </div>

            {/* DETALHES DO CLIENTE */}
            <div className="bg-white text-black p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Cliente</h2>
                {order.client ? (
                    <>
                        <p><strong>Nome:</strong> {order.client.name}</p>
                        <p><strong>Documento:</strong> {order.client.document}</p>
                        <p><strong>Email:</strong> {order.client.email || 'N/A'}</p>
                        <p><strong>Telefone:</strong> {order.client.phone || 'N/A'}</p>
                    </>
                ) : (
                    <p className="text-gray-500">Cliente não encontrado.</p>
                )}
            </div>

            {/* LISTA DE ITENS DA OS */}
            <div className="bg-white text-black p-4 rounded shadow">
                 <h2 className="text-xl font-semibold mb-3">Itens da Locação</h2>
                 {order.order_items.length === 0 ? (
                     <p className="text-gray-500">Nenhum item encontrado nesta OS.</p>
                 ) : (
                     <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                 <tr>
                                     <th className="px-4 py-2 text-left text-xs font-medium">Produto</th>
                                     <th className="px-4 py-2 text-left text-xs font-medium">Qtd</th>
                                     <th className="px-4 py-2 text-left text-xs font-medium">Período</th>
                                     <th className="px-4 py-2 text-left text-xs font-medium">Status Item</th>
                                     <th className="px-4 py-2 text-left text-xs font-medium">Ações</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-200">
                                 {order.order_items.map((item) => (
                                     <tr key={item.id}>
                                         <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{item.product?.name || 'Produto Excluído'}</td>
                                         <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                                         <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                             {new Date(item.start_date).toLocaleDateString('pt-BR')} até {new Date(item.end_date).toLocaleDateString('pt-BR')}
                                         </td>
                                         <td className="px-4 py-2 whitespace-nowrap text-sm">
                                             <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(item.status || 'Draft')}`}>
                                                 {item.status || 'Pendente'}
                                             </span>
                                         </td>
                                         <td className="px-4 py-2 whitespace-nowrap text-sm">
                                             {/* Usando o Componente Cliente para os Botões */}
                                             <StatusButtonsClient 
                                                 orderItemId={item.id} 
                                                 currentStatus={item.status} 
                                                 orderId={orderId} 
                                             />
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
// src/app/dashboard/orders/[orderId]/page.tsx (FINAL + FINANCEIRO + CORREÇÃO SERVER ACTION)

// --- IMPORTS ---
import { getOrderDetails, type OrderDetails } from './actions'
import { getOrderPayments, createPaymentEntry } from './finance.actions' // Ações financeiras
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import StatusButtonsClient from './status-buttons-client' // Botões Check-in/out
import PaymentStatusButtonClient from './payment-status-button-client' // Botão Pagamento
import { Database } from '@/lib/database.types'
import { revalidatePath } from 'next/cache' // Necessário para Server Action interna
import Link from 'next/link'; // Importa o Link para navegação

// --- TIPAGENS ---
type PaymentRow = Database['public']['Tables']['order_payments']['Row']


// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================
export default async function OrderDetailsPage({ params }: { params: { orderId: string } }) {
    const orderId = params.orderId;

    // 1. Verificar autenticação
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options) { cookieStore.set(name, value, options) },
                remove(name: string, options) { cookieStore.set(name, '', options) },
            },
        }
    )
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    // 2. BUSCA DE DADOS (OS + Pagamentos)
    const [order, payments] = await Promise.all([
        getOrderDetails(orderId), // Busca detalhes da OS
        getOrderPayments(orderId) as PaymentRow[] // Busca pagamentos
    ]);

    // 3. Tratamento se a OS não for encontrada
    if (!order) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Ordem de Serviço não encontrada.</h1>
                <Link href="/dashboard/orders" className="text-blue-500 hover:underline mt-4 inline-block">Voltar para a lista</Link>
            </div>
        );
    }
    
    // --- CALCULAR totalValue AQUI (fora da action) ---
    const totalValue = order.order_items.reduce((sum, item) => sum + (parseFloat(item.unit_price as string || '0') * item.quantity), 0);

    // --- SERVER ACTION MODIFICADA (aceita totalValue) ---
    const handleGeneratePayment = async (calculatedValue: number) => {
        'use server'
        // Usa o valor passado como argumento
        await createPaymentEntry(orderId, calculatedValue)
        revalidatePath(`/dashboard/orders/${orderId}`) // Revalida ESTA página
    }
    
    // 4. Helpers de Estilização
    const getStatusStyle = (status: string | null) => {
         switch (status) {
            case 'Reserved': return 'bg-yellow-100 text-yellow-800';
            case 'CheckedOut': return 'bg-red-100 text-red-800';
            case 'CheckedIn': return 'bg-green-100 text-green-800';
            case 'Draft': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const getPaymentStatusStyle = (status: string | null) => {
         switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Paid': return 'bg-green-100 text-green-800';
            case 'Overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // --- RENDERIZAÇÃO DA PÁGINA ---
    return (
        <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
            {/* CABEÇALHO DA OS */}
            <div className="flex justify-between items-center border-b pb-4 mb-6 bg-white p-4 rounded shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Detalhes da OS #{order.id.substring(0, 8)}</h1>
                    <p className="text-sm text-gray-500">Criada em: {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyle(order.status)}`}>
                    Status: {order.status}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DETALHES DO CLIENTE */}
                <div className="bg-white text-gray-800 p-4 rounded shadow-sm border">
                    <h2 className="text-lg font-semibold mb-2 border-b pb-1">Cliente</h2>
                    {order.client ? (
                        <div className="text-sm space-y-1">
                            <p><strong>Nome:</strong> {order.client.name}</p>
                            <p><strong>Documento:</strong> {order.client.document}</p>
                            <p><strong>Email:</strong> {order.client.email || 'N/A'}</p>
                            <p><strong>Telefone:</strong> {order.client.phone || 'N/A'}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Cliente não encontrado.</p>
                    )}
                </div>

                {/* HISTÓRICO DE PAGAMENTOS */}
                <div className="bg-white text-gray-800 p-4 rounded shadow-sm border">
                     <h2 className="text-lg font-semibold mb-3 border-b pb-1">Histórico de Pagamentos</h2>
                     
                     {/* FORM MODIFICADO (usa bind para passar totalValue) */}
                     <form action={handleGeneratePayment.bind(null, totalValue)} className="mb-3">
                         <button type="submit" className="bg-indigo-500 text-white text-xs px-2 py-1 rounded hover:bg-indigo-600">
                             (Teste) Gerar Pagamento Pendente
                         </button>
                     </form>
                     
                     {payments.length === 0 ? (
                         <p className="text-sm text-gray-500">Nenhum registro de pagamento.</p>
                     ) : (
                         <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200 text-xs">
                                 <thead className="bg-gray-50">
                                     <tr>
                                         <th className="px-3 py-2 text-left font-medium">ID Pag.</th>
                                         <th className="px-3 py-2 text-left font-medium">Valor (R$)</th>
                                         <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                                         <th className="px-3 py-2 text-left font-medium">Status</th>
                                         <th className="px-3 py-2 text-left font-medium">Ações</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-200">
                                     {payments.map((payment) => (
                                         <tr key={payment.id}>
                                             <td className="px-3 py-2">{payment.id.substring(0, 8)}</td>
                                             <td className="px-3 py-2 font-semibold">
                                                 {parseFloat(payment.amount as unknown as string).toFixed(2).replace('.', ',')}
                                             </td>
                                             <td className="px-3 py-2">
                                                 {payment.due_date ? new Date(payment.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                                             </td>
                                             <td className="px-3 py-2">
                                                 <span className={`px-2 py-0.5 inline-flex leading-4 font-semibold rounded-full ${getPaymentStatusStyle(payment.status)}`}>
                                                     {payment.status || 'Pendente'}
                                                 </span>
                                             </td>
                                             <td className="px-3 py-2">
                                                 <PaymentStatusButtonClient 
                                                     paymentId={payment.id} 
                                                     currentStatus={payment.status as any} // Cast para o Enum
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


            {/* LISTA DE ITENS DA OS */}
            <div className="bg-white text-gray-800 p-4 rounded shadow-sm border">
                 <h2 className="text-lg font-semibold mb-3 border-b pb-1">Itens da Locação</h2>
                 {order.order_items.length === 0 ? (
                     <p className="text-sm text-gray-500">Nenhum item encontrado nesta OS.</p>
                 ) : (
                     <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200 text-xs">
                             <thead className="bg-gray-50">
                                 <tr>
                                     <th className="px-3 py-2 text-left font-medium">Produto</th>
                                     <th className="px-3 py-2 text-left font-medium">Qtd</th>
                                     <th className="px-3 py-2 text-left font-medium">Período</th>
                                     <th className="px-3 py-2 text-left font-medium">Status Item</th>
                                     <th className="px-3 py-2 text-left font-medium">Ações</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-200">
                                 {order.order_items.map((item) => (
                                     <tr key={item.id}>
                                         <td className="px-3 py-2 font-medium">{item.product?.name || 'Produto Excluído'}</td>
                                         <td className="px-3 py-2">{item.quantity}</td>
                                         <td className="px-3 py-2 text-gray-500">
                                             {new Date(item.start_date).toLocaleDateString('pt-BR')} até {new Date(item.end_date).toLocaleDateString('pt-BR')}
                                         </td>
                                         <td className="px-3 py-2">
                                             <span className={`px-2 py-0.5 inline-flex leading-4 font-semibold rounded-full ${getStatusStyle(item.status)}`}>
                                                 {item.status || 'Pendente'}
                                             </span>
                                         </td>
                                         <td className="px-3 py-2">
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
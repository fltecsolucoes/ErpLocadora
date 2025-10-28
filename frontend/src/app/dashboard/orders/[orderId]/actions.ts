// src/app/dashboard/orders/[orderId]/actions.ts

// Exemplo do TOPO CORRETO de um actions.ts
'use server'

import { cookies } from 'next/headers' // APENAS UMA VEZ
import { createServerClient, type CookieOptions } from '@supabase/ssr' // APENAS UMA VEZ
import { revalidatePath } from 'next/cache' // APENAS UMA VEZ (se usado)
import { Database } from '@/lib/database.types' // APENAS UMA VEZ

// ... (Restante do código, incluindo a função getSupabaseServerClient CORRETA)

// Tipagens
type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderItemRow = Database['public']['Tables']['order_items']['Row']
type ClientRow = Database['public']['Tables']['clients']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']
// Novo status para itens da OS
type OrderItemStatus = 'Reserved' | 'CheckedOut' | 'CheckedIn' | 'Cancelled' | 'Lost' | 'Damaged'


// --- HELPER: Cria o cliente Supabase no Servidor ---
// SUBSTITUA a função getSupabaseServerClient por esta:
function getSupabaseServerClient() {
    const cookieStore = cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) { // Usa CookieOptions
                    try { // Adiciona try/catch para Server Actions que podem ser read-only
                      cookieStore.set(name, value, options)
                    } catch (error) {/* Ignora erros em contextos read-only */}
                },
                remove(name: string, options: CookieOptions) { // Usa CookieOptions
                    try { // Adiciona try/catch
                      cookieStore.set(name, '', options) // Remove setando valor vazio
                    } catch (error) {/* Ignora erros */}
                },
            },
        }
    )
}
// ====================================================================
// 1. AÇÃO PARA BUSCAR DETALHES DA OS (SELECT com JOINS)
// ====================================================================
// Tipagem para o retorno detalhado da OS
export type OrderDetails = OrderRow & {
    client: Pick<ClientRow, 'name' | 'document' | 'email' | 'phone'> | null;
    order_items: (OrderItemRow & {
        product: Pick<ProductRow, 'name'> | null;
    })[];
}


export async function getOrderDetails(orderId: string): Promise<OrderDetails | null> {
    const supabase = getSupabaseServerClient()

    // Busca a OS, o cliente associado, e a lista de itens (com o nome do produto)
    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            client:clients (name, document, email, phone),
            order_items (
                *,
                product:products (name)
            )
        `)
        .eq('id', orderId)
        .single() // Esperamos apenas uma OS com este ID

    if (error) {
        console.error(`Erro ao buscar detalhes da OS ${orderId}:`, error)
        return null
    }

    return order as OrderDetails
}

// ====================================================================
// 2. AÇÃO PARA ATUALIZAR STATUS DE UM ITEM DA OS (UPDATE)
// ====================================================================

export async function updateOrderItemStatus(
    orderItemId: number, 
    newStatus: OrderItemStatus,
    orderId: string // Precisamos do orderId para revalidar a página correta
) {
    const supabase = getSupabaseServerClient()

    // Atualiza o campo 'status' na tabela order_items
    const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', orderItemId)

    if (error) {
        console.error(`Erro ao atualizar status do item ${orderItemId}:`, error)
        return { success: false, message: `Falha ao atualizar status: ${error.message}` }
    }
    
    // Revalida o cache da página de detalhes da OS específica
    revalidatePath(`/dashboard/orders/${orderId}`)

    return { success: true, message: `Status do item atualizado para ${newStatus}.` }
}
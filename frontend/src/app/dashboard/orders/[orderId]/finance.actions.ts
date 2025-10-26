// src/app/dashboard/orders/[orderId]/finance.actions.ts

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// Tipagem
type PaymentRow = Database['public']['Tables']['order_payments']['Row']
type PaymentStatus = Database['public']['Enums']['payment_status'] // Usa o Enum do DB

// --- HELPER: Cria o cliente Supabase no Servidor ---
function getSupabaseServerClient() {
    const cookieStore = cookies()
    return createServerClient(
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
}

// ====================================================================
// 1. AÇÃO PARA BUSCAR PAGAMENTOS DE UMA OS
// ====================================================================
export async function getOrderPayments(orderId: string): Promise<PaymentRow[] | []> {
    const supabase = getSupabaseServerClient()

    const { data: payments, error } = await supabase
        .from('order_payments')
        .select('*')
        .eq('order_id', orderId)
        .order('due_date', { ascending: true }) // Ordena por data de vencimento

    if (error) {
        console.error(`Erro ao buscar pagamentos da OS ${orderId}:`, error)
        return []
    }
    return payments as PaymentRow[]
}

// ====================================================================
// 2. AÇÃO PARA MARCAR PAGAMENTO COMO RECEBIDO
// ====================================================================
export async function markPaymentAsPaid(paymentId: string, orderId: string) {
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
        .from('order_payments')
        .update({ status: 'Paid' as PaymentStatus }) // Atualiza o status
        .eq('id', paymentId)

    if (error) {
        console.error(`Erro ao marcar pagamento ${paymentId} como pago:`, error)
        return { success: false, message: `Falha ao atualizar pagamento: ${error.message}` }
    }
    
    // Revalida a página de detalhes da OS
    revalidatePath(`/dashboard/orders/${orderId}`)
    return { success: true, message: 'Pagamento marcado como recebido!' }
}

// ====================================================================
// 3. (OPCIONAL) AÇÃO PARA CRIAR PAGAMENTO (Ex: ao finalizar OS)
// ====================================================================
// Esta função seria chamada, por exemplo, ao converter a OS ou em um botão "Gerar Fatura"
export async function createPaymentEntry(orderId: string, amount: number, dueDate: string | null = null) {
     const supabase = getSupabaseServerClient()

     const { error } = await supabase
        .from('order_payments')
        .insert({
            order_id: orderId,
            amount: amount,
            due_date: dueDate,
            status: 'Pending' as PaymentStatus
        })
    
     if (error) {
        console.error(`Erro ao criar entrada de pagamento para OS ${orderId}:`, error)
        return { success: false, message: `Falha ao criar pagamento: ${error.message}` }
    }
    
    revalidatePath(`/dashboard/orders/${orderId}`)
    return { success: true, message: 'Entrada de pagamento criada.' }
}
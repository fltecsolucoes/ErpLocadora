// src/app/dashboard/orders/actions.ts

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// Tipagens
type QuoteRow = Database['public']['Tables']['quotes']['Row']
type OrderRow = Database['public']['Tables']['orders']['Row']
type ClientRow = Database['public']['Tables']['clients']['Row']

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
                remove(name: string, value: string, options) { cookieStore.set(name, '', options) },
            },
        }
    )
}

// ====================================================================
// 1. AÇÃO PARA LER ORÇAMENTOS (QUOTES) PARA CONVERSÃO
// ====================================================================

export async function getQuotesForConversion(): Promise<QuoteRow[] | []> {
    const supabase = getSupabaseServerClient()

    // Busca apenas orçamentos em rascunho que ainda não foram convertidos
    const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
            id,
            created_at,
            status,
            client:clients(name) 
        `)
        .eq('status', 'Draft') // Apenas orçamentos que podem ser convertidos
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar orçamentos para conversão:', error)
        return []
    }

    return quotes as QuoteRow[]
}

// ====================================================================
// 2. AÇÃO PARA CONVERTER ORÇAMENTO EM OS (CHAMADA RPC)
// ====================================================================

export async function convertToOS(quoteId: string) {
    const supabase = getSupabaseServerClient()

    // Chama a função RPC (Fase 2) no banco de dados para conversão
    const { data: newOrderId, error } = await supabase.rpc('convert_quote_to_os', {
        p_quote_id: quoteId,
    })

    if (error) {
        console.error('Erro RPC na conversão para OS:', error)
        return { success: false, message: `Falha na conversão: ${error.message}` }
    }
    
    // Revalida ambas as páginas para refletir a mudança
    revalidatePath('/dashboard/quotes')
    revalidatePath('/dashboard/orders')

    return { success: true, message: `Orçamento convertido para OS #${newOrderId.substring(0, 8)}`, newOrderId }
}


// ====================================================================
// 3. AÇÃO PARA LER (LISTAR) ORDENS DE SERVIÇO (OS)
// ====================================================================

export async function getOrders(): Promise<OrderRow[] | []> {
    const supabase = getSupabaseServerClient()

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            status,
            type,
            created_at,
            client:clients(name)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar ordens de serviço:', error)
        return []
    }

    return orders as OrderRow[]
}
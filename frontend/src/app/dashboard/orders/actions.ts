// src/app/dashboard/orders/actions.ts (REFEITO E CORRIGIDO)

'use server'

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// --- TIPAGENS ---
// Tipos base das tabelas (do Supabase)
type QuoteRow = Database['public']['Tables']['quotes']['Row']
type OrderRow = Database['public']['Tables']['orders']['Row']

// Tipo específico para o retorno da função getQuotesForConversion
// Supabase retorna 'clients' como um array de UM objeto (ou null se não houver cliente)
type QuoteForConversionRow = Pick<QuoteRow, 'id' | 'created_at' | 'status'> & {
    client: { name: string }[] | null 
}

// Tipo específico para o retorno da função getOrders
// Supabase retorna 'clients' como um array de UM objeto (ou null se não houver cliente)
type OrderForRow = Pick<OrderRow, 'id' | 'status' | 'type' | 'created_at'> & {
    client: { name: string }[] | null 
};

// --- HELPER: Cria o cliente Supabase no Servidor ---
function getSupabaseServerClient() {
    const cookieStore = cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) { 
                    try { cookieStore.set(name, value, options) } catch (error) {/* Ignora */} 
                },
                remove(name: string, options: CookieOptions) { 
                    try { cookieStore.set(name, '', options) } catch (error) {/* Ignora */} 
                },
            },
        }
    )
}

// ====================================================================
// 1. AÇÃO PARA LER ORÇAMENTOS (QUOTES) PARA CONVERSÃO
// ====================================================================
export async function getQuotesForConversion(): Promise<QuoteForConversionRow[]> { 
    const supabase = getSupabaseServerClient()

    const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
            id,
            created_at,
            status,
            client:clients (name) 
        `)
        .eq('status', 'Draft')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar orçamentos para conversão:', error)
        return [] // Retorna array vazio em caso de erro
    }
    // CORREÇÃO: Usamos 'as unknown' para satisfazer o TypeScript no build,
    // mas garantimos que a estrutura da query corresponde ao tipo.
    return quotes as unknown as QuoteForConversionRow[] 
}

// ====================================================================
// 2. AÇÃO PARA CONVERTER ORÇAMENTO EM OS (CHAMADA RPC)
// ====================================================================
export async function convertToOS(quoteId: string) {
    const supabase = getSupabaseServerClient()

    const { data: newOrderId, error } = await supabase.rpc('convert_quote_to_os', {
        p_quote_id: quoteId,
    })

    if (error) {
        console.error('Erro RPC na conversão para OS:', error)
        return { success: false, message: `Falha na conversão: ${error.message}` }
    }
    
    revalidatePath('/dashboard/quotes')
    revalidatePath('/dashboard/orders')

    return { success: true, message: `Orçamento convertido para OS #${(newOrderId as string).substring(0, 8)}`, newOrderId } 
}

// ====================================================================
// 3. AÇÃO PARA LER (LISTAR) ORDENS DE SERVIÇO (OS)
// ====================================================================
export async function getOrders(): Promise<OrderForRow[]> { 
    const supabase = getSupabaseServerClient()

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            status,
            type,
            created_at,
            client:clients (name) 
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar ordens de serviço:', error)
        return [] // Retorna array vazio em caso de erro
    }
    // CORREÇÃO: Usamos 'as unknown'
    return orders as unknown as OrderForRow[] 
}

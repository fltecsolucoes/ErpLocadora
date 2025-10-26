// src/app/dashboard/quotes/actions.ts

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// --- HELPER: Tipagem e Cliente ---
type ClientRow = Database['public']['Tables']['clients']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']
type QuoteRow = Database['public']['Tables']['quotes']['Row']

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
// 1. AÇÃO PARA LER REQUISITOS (Clientes e Produtos)
// ====================================================================

export async function getQuoteRequirements(): Promise<{ clients: ClientRow[], products: ProductRow[] }> {
    const supabase = getSupabaseServerClient()

    const { data: clients } = await supabase.from('clients').select('id, name').order('name', { ascending: true })
    const { data: products } = await supabase.from('products').select('id, name, rent_value, total_quantity').order('name', { ascending: true })

    return { 
        clients: clients as ClientRow[] || [], 
        products: products as ProductRow[] || [] 
    }
}

// ====================================================================
// 2. AÇÃO PARA VERIFICAR DISPONIBILIDADE (CHAMADA RPC)
// ====================================================================

export async function checkAvailability(
    productId: string, 
    quantity: number, 
    startDate: string, 
    endDate: string
) {
    const supabase = getSupabaseServerClient()

    // Chama a função RPC (Fase 2) no banco de dados
    const { data: availableQuantity, error } = await supabase.rpc('get_product_availability', {
        p_product_id: productId,
        p_start_date: startDate,
        p_end_date: endDate,
    })

    if (error) {
        console.error('Erro RPC de Disponibilidade:', error)
        return { success: false, message: 'Erro interno ao consultar estoque.' }
    }
    
    const isAvailable = availableQuantity >= quantity
    
    return { 
        success: true, 
        isAvailable, 
        availableQuantity: availableQuantity,
        message: isAvailable ? 'Disponível para locação.' : `Indisponível. Apenas ${availableQuantity} unidades estão livres no período.` 
    }
}


// ====================================================================
// 3. AÇÃO PARA CRIAR ORÇAMENTO (INSERT MULTITABELAS)
// ====================================================================

interface QuoteItem {
    product_id: string;
    quantity: number;
    unit_price: number;
    start_date: string;
    end_date: string;
}

export async function createQuote(clientId: string, items: QuoteItem[]) {
    const supabase = getSupabaseServerClient()

    // 1. Cria o registro principal do Orçamento
    const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({ client_id: clientId, status: 'Draft' })
        .select('id')
        .single()

    if (quoteError) {
        console.error('Erro ao criar cabeçalho do orçamento:', quoteError)
        return { success: false, message: `Falha ao criar Orçamento: ${quoteError.message}` }
    }

    const quoteId = quoteData.id
    
    // 2. Formata os Itens do Orçamento
    const quoteItemsData = items.map(item => ({
        quote_id: quoteId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        start_date: item.start_date,
        end_date: item.end_date,
    }))
    
    // 3. Insere os Itens na tabela quote_items
    const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItemsData)

    if (itemsError) {
        console.error('Erro ao inserir itens do orçamento:', itemsError)
        return { success: false, message: `Orçamento criado, mas falha ao adicionar itens: ${itemsError.message}` }
    }

    revalidatePath('/dashboard/quotes')
    return { success: true, message: `Orçamento #${quoteId.substring(0, 8)} criado com sucesso!`, quoteId }
}
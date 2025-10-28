// src/app/dashboard/quotes/actions.ts (REFEITO E CORRIGIDO)

'use server'

import { cookies } from 'next/headers'
// CORREÇÃO: Importa CookieOptions
import { createServerClient, type CookieOptions } from '@supabase/ssr' 
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// --- TIPAGENS ---
type ClientRow = Database['public']['Tables']['clients']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']
type QuoteRow = Database['public']['Tables']['quotes']['Row']

// --- HELPER: Cria o cliente Supabase no Servidor (CORRIGIDO) ---
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
                    try { cookieStore.set(name, value, options) } catch (error) {/* Ignora */}
                },
                remove(name: string, options: CookieOptions) { // Usa CookieOptions
                    try { cookieStore.set(name, '', options) } catch (error) {/* Ignora */}
                },
            },
        }
    )
}

// ====================================================================
// 1. AÇÃO PARA LER REQUISITOS (Clientes e Produtos)
// ====================================================================

// CORREÇÃO: Ajusta o tipo de retorno para ser mais preciso
export async function getQuoteRequirements(): Promise<{ 
    clients: Pick<ClientRow, 'id' | 'name'>[], 
    products: Pick<ProductRow, 'id' | 'name' | 'rent_value' | 'total_quantity'>[] 
}> {
    const supabase = getSupabaseServerClient()

    // Busca apenas os campos necessários para o formulário
    const [clientsRes, productsRes] = await Promise.all([
        supabase.from('clients').select('id, name').order('name', { ascending: true }),
        supabase.from('products').select('id, name, rent_value, total_quantity').order('name', { ascending: true })
    ])
    
    // Trata erros e retorna arrays vazios se necessário
    const clients = clientsRes.data as Pick<ClientRow, 'id' | 'name'>[] || [];
    const products = productsRes.data as Pick<ProductRow, 'id' | 'name' | 'rent_value' | 'total_quantity'>[] || [];

    return { clients, products }
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

    const { data: availableQuantity, error } = await supabase.rpc('get_product_availability', {
        p_product_id: productId,
        p_start_date: startDate,
        p_end_date: endDate,
    })

    if (error) {
        console.error('Erro RPC de Disponibilidade:', error)
        return { success: false, message: 'Erro interno ao consultar estoque.' }
    }
    
    // Garante que availableQuantity seja um número
    const available = typeof availableQuantity === 'number' ? availableQuantity : 0;
    const isAvailable = available >= quantity;
    
    return { 
        success: true, 
        isAvailable, 
        availableQuantity: available,
        message: isAvailable ? 'Disponível para locação.' : `Indisponível. Apenas ${available} unidades estão livres no período.` 
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

    if (quoteError || !quoteData) { // Verifica se quoteData existe
        console.error('Erro ao criar cabeçalho do orçamento:', quoteError)
        return { success: false, message: `Falha ao criar Orçamento: ${quoteError?.message || 'ID não retornado.'}` }
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
        // Considerar deletar o 'quote' criado se os itens falharem? (Transação seria ideal)
        return { success: false, message: `Orçamento criado, mas falha ao adicionar itens: ${itemsError.message}` }
    }

    revalidatePath('/dashboard/quotes') // Revalida a página de orçamentos (se existir listagem)
    revalidatePath('/dashboard/orders') // Revalida a página de OS (para a conversão)
    return { success: true, message: `Orçamento #${quoteId.substring(0, 8)} criado com sucesso!`, quoteId }
}
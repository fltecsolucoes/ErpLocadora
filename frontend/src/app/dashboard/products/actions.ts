// src/app/dashboard/products/actions.ts (REFEITO E CORRIGIDO)

'use server'

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// Tipagens
type Product = Database['public']['Tables']['products']['Row']
type Category = Database['public']['Tables']['categories']['Row']

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
} // <<--- GARANTA QUE ESTA CHAVE ESTÁ AQUI

// ====================================================================
// 1. AÇÃO PARA CRIAR UM NOVO PRODUTO
// ====================================================================
export async function createProduct(formData: FormData) {
    const supabase = getSupabaseServerClient()
    const name = formData.get('name') as string
    // Correção: Garantir que rent_value seja tratado como número ou string antes do parseFloat
    const rentValueInput = formData.get('rent_value');
    const rent_value = typeof rentValueInput === 'string' ? parseFloat(rentValueInput) : NaN;
    const total_quantity = parseInt(formData.get('total_quantity') as string)
    const category_id = formData.get('category_id') as string

    if (!name || isNaN(rent_value) || isNaN(total_quantity) || !category_id) {
        return { success: false, message: 'Dados de produto inválidos ou faltando.' }
    }

    const { error } = await supabase
        .from('products')
        .insert({
            name,
            rent_value,
            total_quantity,
            category_id,
        })

    if (error) {
        console.error('Erro ao criar produto:', error)
        return { success: false, message: `Falha no DB: ${error.message}` }
    }

    revalidatePath('/dashboard/products')
    return { success: true, message: `Produto '${name}' criado com sucesso!` }
} // <<--- GARANTA QUE ESTA CHAVE ESTÁ AQUI

// ====================================================================
// 2. AÇÃO PARA LER (LISTAR) PRODUTOS
// ====================================================================
export async function getProducts(): Promise<Product[] | []> { // <--- Linha 73 (Agora deve estar correta)
    const supabase = getSupabaseServerClient()

    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            rent_value,
            total_quantity,
            categories(name)  // Comentário removido
        `)
        .order('name', { ascending: true })

    if (error) {
        console.error('Erro ao buscar produtos:', error)
        return []
    }
    // Usamos 'as unknown' para build, mas a query corresponde ao tipo Product ajustado
    return products as unknown as Product[]
} // <<--- GARANTA QUE ESTA CHAVE ESTÁ AQUI

// ====================================================================
// 3. AÇÃO PARA LER (LISTAR) CATEGORIAS
// ====================================================================
export async function getCategories(): Promise<Category[] | []> {
    const supabase = getSupabaseServerClient()

    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })

    if (error) {
        console.error('Erro ao buscar categorias:', error)
        return []
    }

    return categories as Category[]
} // <<--- GARANTA QUE ESTA CHAVE ESTÁ AQUI

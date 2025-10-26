// src/app/dashboard/products/actions.ts

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// Tipagem: Obter o tipo da nossa tabela de produtos
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
                set(name: string, value: string, options) { cookieStore.set(name, value, options) },
                remove(name: string, options) { cookieStore.set(name, '', options) },
            },
        }
    )
}

// ====================================================================
// 1. AÇÃO PARA CRIAR UM NOVO PRODUTO (INSERT)
// ====================================================================

export async function createProduct(formData: FormData) {
    const supabase = getSupabaseServerClient()
    const name = formData.get('name') as string
    const rent_value = parseFloat(formData.get('rent_value') as string)
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

    // Revalida o cache da página de listagem
    revalidatePath('/dashboard/products')
    return { success: true, message: `Produto '${name}' criado com sucesso!` }
}

// ====================================================================
// 2. AÇÃO PARA LER (LISTAR) PRODUTOS (SELECT)
// ====================================================================

export async function getProducts(): Promise<Product[] | []> {
    const supabase = getSupabaseServerClient()

    // O RLS (Fase 3) garante que apenas usuários com permissão podem ler
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            rent_value,
            total_quantity,
            categories(name) // Traz o nome da categoria via Foreign Key
        `)
        .order('name', { ascending: true })

    if (error) {
        console.error('Erro ao buscar produtos:', error)
        return []
    }

    // O retorno está no formato correto para a tipagem do Next.js
    return products as Product[]
}

// ====================================================================
// 3. AÇÃO PARA LER (LISTAR) CATEGORIAS (SELECT)
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
}
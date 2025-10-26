// src/app/dashboard/clients/actions.ts

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// Tipagem: Obter o tipo da nossa tabela de clientes
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
// 1. AÇÃO PARA CRIAR UM NOVO CLIENTE (INSERT)
// ====================================================================

export async function createClient(formData: FormData) {
    const supabase = getSupabaseServerClient()
    const name = formData.get('name') as string
    const document = formData.get('document') as string // CPF/CNPJ
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    
    if (!name || !document) {
        return { success: false, message: 'Nome e Documento são obrigatórios.' }
    }

    const { error } = await supabase
        .from('clients')
        .insert({
            name,
            document,
            email,
            phone,
        })

    if (error) {
        console.error('Erro ao criar cliente:', error)
        // Note: Se o documento for duplicado, o DB retornará um erro.
        return { success: false, message: `Falha no DB: ${error.message}` }
    }

    revalidatePath('/dashboard/clients')
    return { success: true, message: `Cliente '${name}' criado com sucesso!` }
}

// ====================================================================
// 2. AÇÃO PARA LER (LISTAR) CLIENTES (SELECT)
// ====================================================================

export async function getClients(): Promise<ClientRow[] | []> {
    const supabase = getSupabaseServerClient()

    const { data: clients, error } = await supabase
        .from('clients')
        .select(`id, name, document, email, phone, created_at`)
        .order('name', { ascending: true })

    if (error) {
        console.error('Erro ao buscar clientes:', error)
        return []
    }
    return clients as ClientRow[]
}

// ====================================================================
// 3. AÇÃO PARA CONSULTAR CNPJ (EDGE FUNCTION)
// ====================================================================

export async function consultCnpj(cnpj: string) {
    // 1. A Edge Function não precisa do cliente Supabase Auth,
    //    mas precisamos do URL base para chamá-la.
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/consulta-cnpj`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Enviamos a chave anon public. A Edge Function não exige o JWT.
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ cnpj }),
        })

        const data = await response.json()

        if (!response.ok) {
            // Se a Edge Function retornar um erro 400 (ex: CNPJ inválido)
            return { success: false, message: data.error || "Erro desconhecido na Edge Function." }
        }
        
        return { success: true, data }
    } catch (error) {
        console.error('Erro de rede ao chamar Edge Function:', error)
        return { success: false, message: 'Erro de conexão com a API de CNPJ.' }
    }
}
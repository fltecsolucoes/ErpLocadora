// src/app/dashboard/products/page.tsx (CORREÇÃO FINAL DE TIPAGEM)

import { Database } from '@/lib/database.types'
import { getProducts, getCategories } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Importa o componente cliente
import ProductFormClient from './product-form-client' 

// Tipagem para a linha de Produto, ajustada para o JOIN com categories
type ProductRow = Omit<Database['public']['Tables']['products']['Row'], 'category_id'> & { 
    categories: { name: string } | null 
}
// Tipagem para a linha de Categoria
type CategoryRow = Database['public']['Tables']['categories']['Row']


// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================

export default async function ProductsPage() {
    // 1. Verificar autenticação
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect('/login') 
    }

    // 2. Buscar dados (Produtos e Categorias)
    // O cast 'as unknown as ...' é necessário porque a função getProducts
    // tem um tipo de retorno mais genérico (Product[]) do que o ProductRow que inclui 'categories'.
    const products = await getProducts() as unknown as ProductRow[] 
    const categories = await getCategories() as CategoryRow[]


    // Usamos Tailwind para layout
    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen"> {/* Fundo claro */}
            <h1 className="text-3xl font-bold text-gray-800">Gestão de Inventário</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna do Formulário de Cadastro */}
                <div className="md:col-span-1">
                    <ProductFormClient categories={categories} />
                </div>
                
                {/* Coluna da Listagem de Produtos */}
                <div className="md:col-span-2">
                    <h2 className="text-xl font-bold mb-4 text-gray-700">Produtos Cadastrados ({products.length})</h2>
                    <div className="space-y-3">
                        {products.length === 0 ? (
                            <p className="text-gray-500">Nenhum produto encontrado. Comece cadastrando um!</p>
                        ) : (
                            <div className="overflow-x-auto bg-white rounded shadow border">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {products.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{p.total_quantity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {/* CORREÇÃO AQUI: Trata p.rent_value como number | null */}
                                                    R$ {(p.rent_value ?? 0).toFixed(2).replace('.', ',')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{p.categories?.name || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
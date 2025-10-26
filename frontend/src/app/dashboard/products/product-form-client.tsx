// src/app/dashboard/products/product-form-client.tsx

'use client' // ISSO PERMITE O USO DE alert() E FORMA CORRETA DO FORM

import { createProduct } from './actions'
import { Database } from '@/lib/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']

interface ProductFormProps {
    categories: CategoryRow[] | [];
}

export default function ProductFormClient({ categories }: ProductFormProps) {
    
    // Função que gerencia o envio do formulário e o feedback
    const handleFormSubmit = async (formData: FormData) => {
        // Chama a Server Action (que roda no servidor)
        const result = await createProduct(formData)
        
        // O feedback (alert) agora funciona porque este código roda no navegador
        if (!result.success) {
            console.error('Erro de submissão:', result.message)
            alert(`Erro ao criar produto: ${result.message}`) 
        } else {
            alert(result.message) // Exibe a mensagem de sucesso
        }
    }

    return (
        // Usamos action={handleFormSubmit} para que a Server Action seja o alvo
        <form action={handleFormSubmit} className="p-4 border rounded shadow-md space-y-4">
            <h2 className="text-xl font-bold">Cadastrar Novo Produto</h2>
            <div>
                <label className="block text-sm font-medium">Nome</label>
                <input name="name" required className="w-full p-2 border rounded" />
            </div>
            
            <div>
                <label className="block text-sm font-medium">Valor de Locação (R$)</label>
                <input name="rent_value" type="number" step="0.01" required className="w-full p-2 border rounded" />
            </div>

            <div>
                <label className="block text-sm font-medium">Estoque Total</label>
                <input name="total_quantity" type="number" required className="w-full p-2 border rounded" />
            </div>

            <div>
                <label className="block text-sm font-medium">Categoria</label>
                <select name="category_id" required className="w-full p-2 border rounded">
                    <option value="">Selecione uma Categoria</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>
            
            <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 w-full">
                Salvar Produto
            </button>
        </form>
    )
}
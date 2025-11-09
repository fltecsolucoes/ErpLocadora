'use client'

import React, { useState, useTransition, useRef } from 'react'
import { createProduct } from './actions'
import { Database } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type CategoryRow = Database['public']['Tables']['categories']['Row']

interface ProductFormProps {
    categories: CategoryRow[] | [];
}

type Status = {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export default function ProductFormClient({ categories }: ProductFormProps) {
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
    const formRef = useRef<HTMLFormElement>(null);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            setStatus({ type: 'loading', message: 'Salvando produto...' });
            const result = await createProduct(formData);
            
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
                formRef.current?.reset();
            } else {
                setStatus({ type: 'error', message: result.message || 'Erro ao salvar produto.' });
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cadastrar Novo Produto</CardTitle>
            </CardHeader>
            <CardContent>
                <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Produto</Label>
                        <Input id="name" name="name" required />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="rent_value">Valor da Diária (R$)</Label>
                        <Input id="rent_value" name="rent_value" type="number" step="0.01" required placeholder="Ex: 25.50" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="total_quantity">Estoque Total</Label>
                        <Input id="total_quantity" name="total_quantity" type="number" required placeholder="Ex: 10" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category_id">Categoria</Label>
                        <select 
                            id="category_id" 
                            name="category_id" 
                            required 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Selecione uma Categoria</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isPending ? 'Salvando...' : 'Salvar Produto'}
                    </Button>

                    {status.type !== 'idle' && (
                         <p className={`text-sm text-center ${
                            status.type === 'error' ? 'text-destructive' :
                            status.type === 'success' ? 'text-green-500' :
                            'text-muted-foreground'
                        }`}>
                            {status.message}
                        </p>
                    )}
                </form>
            </CardContent>
        </Card>
    )
}

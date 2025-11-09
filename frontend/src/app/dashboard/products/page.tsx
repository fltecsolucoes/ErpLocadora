import { Database } from '@/lib/database.types'
import { getProducts, getCategories } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import ProductFormClient from './product-form-client' 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ProductRow = Omit<Database['public']['Tables']['products']['Row'], 'category_id'> & { 
    categories: { name: string } | null 
}
type CategoryRow = Database['public']['Tables']['categories']['Row']

export default async function ProductsPage() {
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

    const [products, categories] = await Promise.all([
        getProducts() as unknown as ProductRow[],
        getCategories() as CategoryRow[]
    ]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Gestão de Inventário</h1>
                <p className="text-muted-foreground">Adicione e gerencie os produtos do seu estoque.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <ProductFormClient categories={categories} />
                </div>
                
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Produtos Cadastrados</CardTitle>
                            <CardDescription>Total de {products.length} produtos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Estoque</TableHead>
                                        <TableHead className="text-right">Valor Diária</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Nenhum produto encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        products.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{p.categories?.name || 'N/A'}</TableCell>
                                                <TableCell>{p.total_quantity}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.rent_value ?? 0)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

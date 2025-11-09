import { getClients } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'
import ClientFormClient from './client-form-client' 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ClientRow = Database['public']['Tables']['clients']['Row']

export default async function ClientsPage() {
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
    
    const clients = await getClients() as ClientRow[]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
                <p className="text-muted-foreground">Adicione, consulte e gerencie seus clientes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <ClientFormClient />
                </div>
                
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clientes Cadastrados</CardTitle>
                            <CardDescription>Total de {clients.length} clientes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Desde</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Nenhum cliente encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        clients.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{c.document}</TableCell>
                                                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                                               <TableCell className="text-right text-muted-foreground">
                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : 'N/A'}
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

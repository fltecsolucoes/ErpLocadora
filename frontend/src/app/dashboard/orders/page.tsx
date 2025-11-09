import { getOrders, getQuotesForConversion } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link';
import ConversionButtonClient from './conversion-button-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function OrdersPage() {
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

    const [orders, quotes] = await Promise.all([
        getOrders(),
        getQuotesForConversion()
    ])
    
    const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Reserved': return 'secondary';
            case 'CheckedOut': return 'destructive';
            case 'CheckedIn': return 'default';
            case 'Draft': return 'outline';
            default: return 'outline';
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Gestão de Ordens de Serviço</h1>
                <p className="text-muted-foreground">Converta orçamentos em OS e gerencie locações ativas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Orçamentos para Conversão</CardTitle>
                    <CardDescription>Orçamentos em modo "Rascunho" prontos para virar uma Ordem de Serviço.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data Criação</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Nenhum orçamento para conversão.</TableCell>
                                </TableRow>
                            ) : (
                                quotes.map((q) => (
                                    <tr key={q.id}>
                                        <TableCell className="font-mono text-xs">{q.id.substring(0, 8)}</TableCell>
                                        <TableCell className="font-medium">{q.client?.[0]?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {q.created_at ? new Date(q.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                                        </TableCell>
                                        <td className="text-right">
                                            <ConversionButtonClient quoteId={q.id} /> 
                                        </td>
                                    </tr>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ordens de Serviço Ativas</CardTitle>
                    <CardDescription>Acompanhe todas as ordens de serviço em andamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#OS</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data Criação</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Nenhuma OS ativa encontrada.</TableCell>
                                </TableRow>
                            ) : (
                                orders.map((o) => (
                                    <tr key={o.id}>
                                        <TableCell className="font-mono text-xs">{o.id.substring(0, 8)}</TableCell>
                                        <TableCell>{o.type || 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{o.client?.[0]?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(o.status)}>{o.status || 'Pendente'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/orders/${o.id}`} className="text-primary hover:underline text-sm font-medium">
                                                Ver Detalhes
                                            </Link>
                                        </TableCell>
                                    </tr>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

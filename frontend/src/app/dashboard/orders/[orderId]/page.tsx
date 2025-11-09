import { getOrderDetails } from './actions'
import { getOrderPayments, createPaymentEntry } from './finance.actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import StatusButtonsClient from './status-buttons-client'
import PaymentStatusButtonClient from './payment-status-button-client'
import { revalidatePath } from 'next/cache'
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CircleUser, ReceiptText, Package } from 'lucide-react'

export default async function OrderDetailsPage({ params }: { params: { orderId: string } }) {
    const orderId = params.orderId;

    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const [order, payments] = await Promise.all([
        getOrderDetails(orderId),
        getOrderPayments(orderId)
    ]);

    if (!order) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Ordem de Serviço não encontrada.</h1>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/dashboard/orders">Voltar para a lista</Link>
                </Button>
            </div>
        );
    }
    
    const totalValue = order.order_items.reduce((sum, item) => {
        const price = item.unit_price ?? 0; 
        return sum + (price * item.quantity);
    }, 0);

    const handleGeneratePayment = async () => {
        'use server'
        await createPaymentEntry(orderId, totalValue)
        revalidatePath(`/dashboard/orders/${orderId}`)
    }
    
    const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Reserved': return 'secondary';
            case 'CheckedOut': return 'destructive';
            case 'CheckedIn': return 'default';
            case 'Draft': return 'outline';
            default: return 'outline';
        }
    };
    
    const getPaymentStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
         switch (status) {
            case 'Pending': return 'secondary';
            case 'Paid': return 'default';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">OS #{order.id.substring(0, 8)}</h1>
                    <p className="text-muted-foreground">
                        Criada em: {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                </div>
                <Badge variant={getStatusVariant(order.status)} className="text-sm">
                    {order.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center space-x-4">
                             <Package className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <CardTitle>Itens da Locação</CardTitle>
                                <CardDescription>Detalhes dos produtos, quantidades e status.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Qtd</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.order_items.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum item nesta OS.</TableCell></TableRow>
                                    ) : (
                                        order.order_items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product?.name || 'Produto Excluído'}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{new Date(item.start_date).toLocaleDateString('pt-BR')} a {new Date(item.end_date).toLocaleDateString('pt-BR')}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusVariant(item.status)}>{item.status || 'Pendente'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <StatusButtonsClient 
                                                        orderItemId={item.id} 
                                                        currentStatus={item.status} 
                                                        orderId={orderId} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center space-x-4">
                            <CircleUser className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <CardTitle>Cliente</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            {order.client ? (
                                <>
                                    <p className="font-semibold">{order.client.name}</p>
                                    <p className="text-muted-foreground">{order.client.document}</p>
                                    <p className="text-muted-foreground">{order.client.email || 'N/A'}</p>
                                    <p className="text-muted-foreground">{order.client.phone || 'N/A'}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground">Cliente não encontrado.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center space-x-4">
                            <ReceiptText className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <CardTitle>Financeiro</CardTitle>
                                <CardDescription>Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {payments.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    <p>Nenhum pagamento gerado.</p>
                                    <form action={handleGeneratePayment}>
                                        <Button size="sm" className="mt-4">Gerar Fatura</Button>
                                    </form>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(payment.amount as unknown as string))}</TableCell>
                                                <TableCell><Badge variant={getPaymentStatusVariant(payment.status)}>{payment.status || 'Pendente'}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <PaymentStatusButtonClient 
                                                        paymentId={payment.id} 
                                                        currentStatus={payment.status as any}
                                                        orderId={orderId} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

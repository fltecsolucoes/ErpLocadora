'use client'

import React, { useState, useMemo, useTransition, useRef } from 'react'
import { getQuoteRequirements, checkAvailability, createQuote } from './actions'
import { Database } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Loader2, Trash2, RefreshCw } from 'lucide-react'

// Tipagens
type ClientRow = Database['public']['Tables']['clients']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']

interface QuoteItem {
    id: number;
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    start_date: string;
    end_date: string;
    status?: 'ok' | 'warning' | 'error' | 'pending';
    status_message?: string;
}

interface QuoteFormProps {
    initialData: {
        clients: Pick<ClientRow, 'id' | 'name'>[];
        products: Pick<ProductRow, 'id' | 'name' | 'rent_value' | 'total_quantity'>[];
    };
}

type Status = {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export default function QuoteFormClient({ initialData }: QuoteFormProps) {
    const { clients, products } = initialData;
    
    // Estados
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
    const [isSubmitting, startSubmitTransition] = useTransition();
    const [isChecking, startCheckTransition] = useTransition();
    const [checkingItemId, setCheckingItemId] = useState<number | null>(null);
    const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
    const addItemFormRef = useRef<HTMLFormElement>(null);

    const [newItem, setNewItem] = useState({
        productId: '',
        quantity: 1,
        startDate: '',
        endDate: '',
    });

    // Funções de Lógica
    const handleCheckAvailability = async (item: QuoteItem) => {
        setCheckingItemId(item.id);
        startCheckTransition(async () => {
            setQuoteItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending', status_message: 'Verificando...' } : i));

            const reservedInQuote = quoteItems
                .filter(i => i.product_id === item.product_id && i.id !== item.id && i.end_date >= item.start_date && i.start_date <= item.end_date)
                .reduce((sum, i) => sum + i.quantity, 0);

            const productTotal = products.find(p => p.id === item.product_id)?.total_quantity || 0;
            
            if (item.quantity + reservedInQuote > productTotal) {
                 setQuoteItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', status_message: `Estoque Físico Excedido (Máx: ${productTotal})` } : i));
                 setCheckingItemId(null);
                 return; 
            }
            
            const totalQuantityToVerify = item.quantity + reservedInQuote;
            const result = await checkAvailability(item.product_id, totalQuantityToVerify, item.start_date, item.end_date);

            if (result.success) {
                setQuoteItems(prev => prev.map(i => i.id === item.id ? { 
                    ...i, 
                    status: result.isAvailable ? 'ok' : 'error', 
                    status_message: result.isAvailable ? `Disponível (${result.availableQuantity} livres)` : `Apenas ${result.availableQuantity} livres`
                } : i));
            } else {
                setQuoteItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', status_message: 'Falha na verificação.' } : i));
            }
            setCheckingItemId(null);
        });
    }

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.productId || !newItem.startDate || !newItem.endDate || newItem.quantity <= 0) {
            setStatus({type: 'error', message: 'Preencha o produto, quantidade e datas para adicionar.'});
            return;
        }

        const productInfo = products.find(p => p.id === newItem.productId);
        if (!productInfo) return;

        const newQuoteItem: QuoteItem = {
            id: Date.now(),
            product_id: productInfo.id,
            product_name: productInfo.name,
            unit_price: parseFloat(productInfo.rent_value as unknown as string),
            quantity: newItem.quantity,
            start_date: newItem.startDate,
            end_date: newItem.endDate,
            status: 'pending',
            status_message: 'Pendente'
        };

        setQuoteItems(prev => [...prev, newQuoteItem]);
        handleCheckAvailability(newQuoteItem);
        
        setNewItem({ productId: '', quantity: 1, startDate: '', endDate: '' });
        addItemFormRef.current?.reset();
        setStatus({type: 'idle', message: ''});
    }

    const handleRemoveItem = (id: number) => {
        setQuoteItems(prev => prev.filter(item => item.id !== id));
    }

    const handleSubmitQuote = async () => {
        if (!selectedClientId) {
            setStatus({type: 'error', message: 'Selecione o cliente primeiro.'});
            return;
        }
        if (quoteItems.length === 0) {
            setStatus({type: 'error', message: 'Adicione pelo menos um item ao orçamento.'});
            return;
        }
        
        const hasErrors = quoteItems.some(item => item.status === 'error');
        if (hasErrors) {
            setStatus({type: 'error', message: 'Corrija os erros de estoque antes de finalizar.'});
            return;
        }

        startSubmitTransition(async () => {
            setStatus({ type: 'loading', message: 'Finalizando orçamento...' });
            const itemsToSubmit = quoteItems.map(item => ({
                product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price,
                start_date: item.start_date, end_date: item.end_date,
            }));
            
            const result = await createQuote(selectedClientId, itemsToSubmit);

            if (result.success) {
                setStatus({ type: 'success', message: result.message || 'Orçamento criado com sucesso!' });
                setQuoteItems([]);
                setSelectedClientId('');
            } else {
                setStatus({ type: 'error', message: `Falha: ${result.message}` });
            }
        });
    }
    
    // Cálculos
    const totalQuoteValue = useMemo(() => {
        return quoteItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    }, [quoteItems]);
    
    const selectedProduct = products.find(p => p.id === newItem.productId);

    const getStatusColor = (status?: QuoteItem['status']) => {
        switch (status) {
            case 'ok': return 'bg-green-100 text-green-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Item</CardTitle>
                </CardHeader>
                <CardContent>
                    <form ref={addItemFormRef} onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="product">Produto</Label>
                                <select id="product" value={newItem.productId} onChange={(e) => setNewItem(prev => ({ ...prev, productId: e.target.value }))}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                    <option value="">Selecione...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Qtd</Label>
                                <Input id="quantity" type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Início</Label>
                                <Input id="start_date" type="date" value={newItem.startDate} onChange={(e) => setNewItem(prev => ({ ...prev, startDate: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Fim</Label>
                                <Input id="end_date" type="date" value={newItem.endDate} onChange={(e) => setNewItem(prev => ({ ...prev, endDate: e.target.value }))} />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Adicionar ao Orçamento</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Itens do Orçamento</CardTitle>
                    <CardDescription>Total de {quoteItems.length} itens.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Qtd</TableHead>
                                <TableHead>Preço (Un)</TableHead>
                                <TableHead>Subtotal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quoteItems.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum item adicionado.</TableCell></TableRow>
                            ) : (
                                quoteItems.map(item => (
                                    <TableRow key={item.id} className={item.status === 'error' ? 'bg-destructive/10' : ''}>
                                        <TableCell className="font-medium">{item.product_name}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{new Date(item.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(item.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>R$ {item.unit_price.toFixed(2).replace('.', ',')}</TableCell>
                                        <TableCell className="font-medium">R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                                {item.status_message}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleCheckAvailability(item)} disabled={isChecking && checkingItemId === item.id}>
                                                {isChecking && checkingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={6} className="text-right font-bold text-lg">Total do Orçamento</TableCell>
                                <TableCell className="text-right font-bold text-lg">R$ {totalQuoteValue.toFixed(2).replace('.', ',')}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cliente e Finalização</CardTitle>
                    <CardDescription>Selecione o cliente e salve o orçamento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="client">Cliente</Label>
                        <select id="client" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Selecione um Cliente</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                     {status.type !== 'idle' && (
                         <p className={`text-sm text-center font-medium ${
                            status.type === 'error' ? 'text-destructive' :
                            status.type === 'success' ? 'text-green-500' :
                            'text-muted-foreground'
                        }`}>
                            {status.message}
                        </p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmitQuote} className="w-full" size="lg" disabled={isSubmitting || !selectedClientId || quoteItems.length === 0}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSubmitting ? 'Salvando...' : `Finalizar Orçamento (R$ ${totalQuoteValue.toFixed(2).replace('.', ',')})`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

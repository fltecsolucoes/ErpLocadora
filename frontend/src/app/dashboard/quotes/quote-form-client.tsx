// src/app/dashboard/quotes/quote-form-client.tsx

'use client'

import React, { useState, useMemo } from 'react'
import { getQuoteRequirements, checkAvailability, createQuote } from './actions'
import { Database } from '@/lib/database.types'

// Tipagens (simplificadas para o Client Component)
type ClientRow = Database['public']['Tables']['clients']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']

// Tipo para os Itens do Orçamento (o carrinho)
interface QuoteItem {
    id: number; // ID local (para React keys)
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    start_date: string;
    end_date: string;
    status?: 'ok' | 'warning' | 'error';
    status_message?: string;
}

interface QuoteFormProps {
    initialData: {
        clients: Pick<ClientRow, 'id' | 'name'>[];
        products: Pick<ProductRow, 'id' | 'name' | 'rent_value' | 'total_quantity'>[];
    };
}

// ====================================================================
// COMPONENTE PRINCIPAL DO FORMULÁRIO
// ====================================================================

export default function QuoteFormClient({ initialData }: QuoteFormProps) {
    const { clients, products } = initialData;
    
    // Estado do formulário principal
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para adicionar um novo item
    const [newItem, setNewItem] = useState({
        productId: '',
        quantity: 1,
        startDate: '',
        endDate: '',
    });

    // ----------------------------------------------------
    // FUNÇÕES DE DISPONIBILIDADE
    // ----------------------------------------------------

    // (CÓDIGO CORRIGIDO que você precisa garantir que esteja no arquivo)

// Linha 57:
    const handleCheckAvailability = async (item: QuoteItem) => {
        
        // ----------------------------------------------------
        // NOVO: 1. Calcule a quantidade já reservada NESTE ORÇAMENTO (os itens antes deste)
        // ----------------------------------------------------
        const reservedInQuote = quoteItems
            // Filtra por itens que têm o mesmo produto E datas que se sobrepõem
            .filter(i => 
                i.product_id === item.product_id && 
                i.id !== item.id && // Exclui o item que está sendo verificado
                // Simples verificação de sobreposição de datas (para fins de teste)
                i.end_date >= item.start_date && 
                i.start_date <= item.end_date
            )
            .reduce((sum, i) => sum + i.quantity, 0);

        // Verifica o estoque total do produto
        const productTotal = products.find(p => p.id === item.product_id)?.total_quantity || 0;
        
        // Verificação de CONSISTÊNCIA INTERNA (se o carrinho excede o estoque físico)
        if (item.quantity + reservedInQuote > productTotal) {
             setQuoteItems(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: 'error', 
                status_message: `Estoque Físico Excedido (Máx: ${productTotal})`
            } : i));
            return; 
        }
        
        // ----------------------------------------------------
        // 2. Chame a RPC para verificar reservas de OUTROS ORÇAMENTOS (OS passadas)
        // ----------------------------------------------------
        
        setQuoteItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'warning', status_message: 'Verificando...' } : i));
        
        // Passa a quantidade total solicitada NESTE QUOTE para a RPC
        const totalQuantityToVerify = item.quantity + reservedInQuote;
        
        const result = await checkAvailability(
            item.product_id, 
            totalQuantityToVerify, 
            item.start_date, 
            item.end_date
        );

        if (result.success) {
            setQuoteItems(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: result.isAvailable ? 'ok' : 'error', 
                status_message: result.isAvailable 
                    ? 'Disponível' 
                    : `Apenas ${result.availableQuantity} livres`
            } : i));
        } else {
            setQuoteItems(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: 'error', 
                status_message: 'Falha na verificação.'
            } : i));
        }
    }

    // ----------------------------------------------------
    // FUNÇÕES DE GERENCIAMENTO DE ITENS
    // ----------------------------------------------------

    const handleAddItem = () => {
        if (!newItem.productId || !newItem.startDate || !newItem.endDate || newItem.quantity <= 0) {
            return alert('Preencha o produto, quantidade, data inicial e final.');
        }

        const productInfo = products.find(p => p.id === newItem.productId);
        if (!productInfo) return;

        const newQuoteItem: QuoteItem = {
            id: Date.now(), // ID único local
            product_id: productInfo.id,
            product_name: productInfo.name,
            unit_price: parseFloat(productInfo.rent_value as unknown as string),
            quantity: newItem.quantity,
            start_date: newItem.startDate,
            end_date: newItem.endDate,
        };

        setQuoteItems(prev => [...prev, newQuoteItem]);
        setNewItem({ productId: '', quantity: 1, startDate: '', endDate: '' });
        
        // Verifica a disponibilidade imediatamente
        handleCheckAvailability(newQuoteItem);
    }

    const handleRemoveItem = (id: number) => {
        setQuoteItems(prev => prev.filter(item => item.id !== id));
    }
    
    // ----------------------------------------------------
    // FUNÇÃO DE SUBMISSÃO FINAL
    // ----------------------------------------------------

    const handleSubmitQuote = async () => {
        if (!selectedClientId) return alert('Selecione o cliente primeiro.');
        if (quoteItems.length === 0) return alert('Adicione pelo menos um item ao orçamento.');
        
        // Verifica se há erros de disponibilidade antes de submeter
        const hasErrors = quoteItems.some(item => item.status === 'error');
        if (hasErrors) return alert('Corrija os erros de estoque antes de finalizar o orçamento.');

        setIsSubmitting(true);
        
        // Mapeia o estado local para o formato de DB
        const itemsToSubmit = quoteItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            start_date: item.start_date,
            end_date: item.end_date,
        }));
        
        const result = await createQuote(selectedClientId, itemsToSubmit);

        if (result.success) {
            alert(result.message);
            // Limpa o estado após o sucesso
            setQuoteItems([]);
            setSelectedClientId('');
        } else {
            alert(`Falha na criação do Orçamento: ${result.message}`);
        }
        setIsSubmitting(false);
    }
    
    // ----------------------------------------------------
    // CÁLCULOS
    // ----------------------------------------------------
    
    const totalQuoteValue = useMemo(() => {
        return quoteItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    }, [quoteItems]);
    
    const selectedProduct = products.find(p => p.id === newItem.productId);

    return (
        <div className="space-y-6">
            
            {/* SELEÇÃO DE CLIENTE E BOTÃO FINAL */}
            <div className="p-4 border rounded shadow-md bg-gray-100 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <label className="font-bold">Cliente:</label>
                    <select 
                        className="p-2 border rounded"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                        <option value="">Selecione um Cliente</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
                
                <button 
                    onClick={handleSubmitQuote} 
                    disabled={isSubmitting || !selectedClientId || quoteItems.length === 0}
                    className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-bold">
                    {isSubmitting ? 'Salvando...' : `FINALIZAR ORÇAMENTO (R$ ${totalQuoteValue.toFixed(2).replace('.', ',')})`}
                </button>
            </div>

            {/* ADICIONAR NOVO ITEM */}
            <div className="p-4 border rounded shadow-md space-y-4 bg-white text-black">
                <h3 className="text-lg font-bold">Adicionar Item</h3>
                <div className="grid grid-cols-6 gap-3 items-end">
                    
                    {/* Produto */}
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Produto</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={newItem.productId}
                            onChange={(e) => setNewItem(prev => ({ ...prev, productId: e.target.value }))}
                        >
                            <option value="">Selecione...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (R$ {parseFloat(p.rent_value as unknown as string).toFixed(2).replace('.', ',')})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quantidade e Valor Unitário */}
                    <div>
                        <label className="block text-sm font-medium">Qtd</label>
                        <input 
                            type="number" 
                            min="1"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                            className="w-full p-2 border rounded" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Valor Unit.</label>
                        <input 
                            readOnly
                            value={selectedProduct ? `R$ ${parseFloat(selectedProduct.rent_value as unknown as string).toFixed(2).replace('.', ',')}` : 'N/A'}
                            className="w-full p-2 border rounded bg-gray-200"
                        />
                    </div>
                    
                    {/* Datas */}
                    <div>
                        <label className="block text-sm font-medium">Início</label>
                        <input 
                            type="date" 
                            value={newItem.startDate}
                            onChange={(e) => setNewItem(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full p-2 border rounded" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Fim</label>
                        <input 
                            type="date" 
                            value={newItem.endDate}
                            onChange={(e) => setNewItem(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full p-2 border rounded" 
                        />
                    </div>

                </div>
                <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="bg-green-600 text-white p-2 rounded hover:bg-green-700 w-full">
                    Adicionar ao Orçamento
                </button>
            </div>

            {/* LISTAGEM DE ITENS E STATUS DE ESTOQUE */}
            <h3 className="text-lg font-bold">Itens do Orçamento</h3>
            {quoteItems.length === 0 ? (
                <p className="text-gray-500">Nenhum item adicionado.</p>
            ) : (
                <div className="overflow-x-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200 bg-white text-black">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium">Produto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Qtd</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Preço (Un)</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Período</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Status Estoque</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Total</th>
                                <th className="px-4 py-2 text-left text-xs font-medium">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {quoteItems.map(item => (
                                <tr key={item.id} className={item.status === 'error' ? 'bg-red-100' : 'bg-white'}>
                                    <td className="px-4 py-2 whitespace-nowrap">{item.product_name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">R$ {item.unit_price.toFixed(2).replace('.', ',')}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                                        {item.start_date} <br/> até {item.end_date}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'ok' ? 'bg-green-100 text-green-800' : item.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {item.status_message || 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap font-bold">R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <button 
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-red-600 hover:text-red-900 ml-2">
                                            Remover
                                        </button>
                                        <button 
                                            onClick={() => handleCheckAvailability(item)}
                                            className="text-blue-600 hover:text-blue-900 ml-2">
                                            Verificar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* LINHA DE TOTAL */}
                            <tr>
                                <td colSpan={5} className="px-4 py-2 text-right font-bold bg-gray-50">VALOR TOTAL:</td>
                                <td className="px-4 py-2 font-bold bg-gray-50">R$ {totalQuoteValue.toFixed(2).replace('.', ',')}</td>
                                <td className="px-4 py-2 bg-gray-50"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
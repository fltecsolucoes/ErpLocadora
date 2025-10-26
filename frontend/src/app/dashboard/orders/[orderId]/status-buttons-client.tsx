// src/app/dashboard/orders/[orderId]/status-buttons-client.tsx
'use client'

import { useState } from 'react'
import { updateOrderItemStatus } from './actions'

// Define os possíveis status que um item pode ter
type OrderItemStatus = 'Reserved' | 'CheckedOut' | 'CheckedIn' | 'Cancelled' | 'Lost' | 'Damaged';

interface StatusButtonsProps {
    orderItemId: number;
    currentStatus: string | null; // O status atual do item vindo do DB
    orderId: string; // ID da OS para revalidação
}

export default function StatusButtonsClient({ orderItemId, currentStatus, orderId }: StatusButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdateStatus = async (newStatus: OrderItemStatus) => {
        setIsLoading(true);
        const result = await updateOrderItemStatus(orderItemId, newStatus, orderId);
        if (!result.success) {
            alert(`Erro: ${result.message}`);
        } else {
            alert(result.message); // Ou usar uma notificação melhor
        }
        setIsLoading(false);
    }

    return (
        <div className="flex space-x-2">
            {currentStatus === 'Reserved' && (
                <button
                    onClick={() => handleUpdateStatus('CheckedOut')}
                    disabled={isLoading}
                    className="bg-orange-500 text-white px-2 py-1 text-xs rounded hover:bg-orange-600 disabled:bg-gray-400"
                >
                    {isLoading ? '...' : 'Check-Out'}
                </button>
            )}
            {currentStatus === 'CheckedOut' && (
                <button
                    onClick={() => handleUpdateStatus('CheckedIn')}
                    disabled={isLoading}
                    className="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                    {isLoading ? '...' : 'Check-In'}
                </button>
                // Futuro: Adicionar botões para 'Damaged' ou 'Lost' aqui
            )}
            {currentStatus === 'CheckedIn' && (
                <span className="text-green-600 text-xs font-semibold">Devolvido</span>
            )}
            {/* Adicionar outros status como Cancelled, Lost, etc. se necessário */}
        </div>
    )
}
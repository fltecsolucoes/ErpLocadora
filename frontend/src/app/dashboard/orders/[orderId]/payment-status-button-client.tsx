// src/app/dashboard/orders/[orderId]/payment-status-button-client.tsx
'use client'

import { useState } from 'react'
import { markPaymentAsPaid } from './finance.actions' // Importa a nova ação

// Define os possíveis status que um pagamento pode ter (do Enum do DB)
type PaymentStatus = 'Pending' | 'Paid' | 'Overdue';

interface PaymentButtonProps {
    paymentId: string;
    currentStatus: PaymentStatus | null;
    orderId: string; // Para revalidação
}

export default function PaymentStatusButtonClient({ paymentId, currentStatus, orderId }: PaymentButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleMarkAsPaid = async () => {
        setIsLoading(true);
        const result = await markPaymentAsPaid(paymentId, orderId);
        if (!result.success) {
            alert(`Erro: ${result.message}`);
        } else {
            alert(result.message); // Ou usar uma notificação melhor
        }
        setIsLoading(false);
    }

    // Se já estiver pago, mostra um texto
    if (currentStatus === 'Paid') {
        return <span className="text-green-600 text-xs font-semibold">Recebido</span>;
    }

    // Se estiver pendente (ou atrasado), mostra o botão
    return (
        <button
            onClick={handleMarkAsPaid}
            disabled={isLoading}
            className="bg-emerald-500 text-white px-2 py-1 text-xs rounded hover:bg-emerald-600 disabled:bg-gray-400"
        >
            {isLoading ? '...' : 'Marcar Pago'}
        </button>
    );
}
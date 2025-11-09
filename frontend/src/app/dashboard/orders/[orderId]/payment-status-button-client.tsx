'use client'

import { useTransition } from 'react'
import { markPaymentAsPaid } from './finance.actions'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type PaymentStatus = 'Pending' | 'Paid' | 'Overdue';

interface PaymentButtonProps {
    paymentId: string;
    currentStatus: PaymentStatus | null;
    orderId: string;
}

export default function PaymentStatusButtonClient({ paymentId, currentStatus, orderId }: PaymentButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleMarkAsPaid = async () => {
        startTransition(async () => {
            const result = await markPaymentAsPaid(paymentId, orderId);
            if (!result.success) {
                console.error(result.message);
            }
        });
    }

    if (currentStatus === 'Paid') {
        return <span className="text-sm text-green-600 font-medium">Recebido</span>;
    }

    return (
        <Button
            onClick={handleMarkAsPaid}
            disabled={isPending}
            variant="secondary"
            size="sm"
        >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Marcar Pago'}
        </Button>
    );
}

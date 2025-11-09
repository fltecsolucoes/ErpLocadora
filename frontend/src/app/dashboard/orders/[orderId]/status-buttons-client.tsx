'use client'

import { useTransition } from 'react'
import { updateOrderItemStatus } from './actions'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type OrderItemStatus = 'Reserved' | 'CheckedOut' | 'CheckedIn' | 'Cancelled' | 'Lost' | 'Damaged';

interface StatusButtonsProps {
    orderItemId: number;
    currentStatus: string | null;
    orderId: string;
}

export default function StatusButtonsClient({ orderItemId, currentStatus, orderId }: StatusButtonsProps) {
    const [isPending, startTransition] = useTransition();

    const handleUpdateStatus = async (newStatus: OrderItemStatus) => {
        startTransition(async () => {
            const result = await updateOrderItemStatus(orderItemId, newStatus, orderId);
            if (!result.success) {
                // Idealmente, usar um toast para notificação de erro
                console.error(result.message);
            }
        });
    }

    if (currentStatus === 'CheckedIn') {
        return <span className="text-sm text-green-600 font-medium">Devolvido</span>;
    }

    return (
        <div className="flex space-x-2 justify-end">
            {currentStatus === 'Reserved' && (
                <Button
                    onClick={() => handleUpdateStatus('CheckedOut')}
                    disabled={isPending}
                    variant="outline"
                    size="sm"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check-Out'}
                </Button>
            )}
            {currentStatus === 'CheckedOut' && (
                <Button
                    onClick={() => handleUpdateStatus('CheckedIn')}
                    disabled={isPending}
                    variant="default"
                    size="sm"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check-In'}
                </Button>
            )}
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { convertToOS } from './actions'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function ConversionButtonClient({ quoteId }: { quoteId: string }) {
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<{success: boolean, message: string} | null>(null)

    const handleConvert = async () => {
        startTransition(async () => {
            const result = await convertToOS(quoteId)
            setStatus(result)
            // Idealmente, usar um toast para notificação
            if (result.success) {
                console.log(result.message)
            } else {
                console.error(result.message)
            }
        });
    }

    return (
        <Button 
            onClick={handleConvert}
            disabled={isPending}
            size="sm"
        >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Convertendo...' : 'Converter em OS'}
        </Button>
    )
}

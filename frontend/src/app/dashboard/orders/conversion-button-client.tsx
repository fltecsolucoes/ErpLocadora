// src/app/dashboard/orders/conversion-button-client.tsx
'use client' // Garante que é um Client Component

import { convertToOS } from './actions' // Precisa importar a Server Action aqui

// Cole a função ConversionButton aqui:
export default function ConversionButtonClient({ quoteId }: { quoteId: string }) {
    const handleConvert = async () => {
        const result = await convertToOS(quoteId) 

        if (result.success) {
            alert(result.message)
        } else {
            alert(`Erro na Conversão: ${result.message}`)
        }
    }

    return (
        <button 
            onClick={handleConvert}
            className="bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700 transition-colors">
            Converter em OS
        </button>
    )
}

// ====================================================================
// COMPONENTE CLIENTE: Botão de Conversão (CORRIGIDO)
// ====================================================================
function ConversionButton({ quoteId }: { quoteId: string }) {
    'use client'

    const handleConvert = async () => {
        // Usa a Server Action para iniciar a conversão no backend
        const result = await convertToOS(quoteId) 
        
        if (result.success) {
            alert(result.message)
        } else {
            alert(`Erro na Conversão: ${result.message}`)
        }
    }

    return (
        <button 
            onClick={handleConvert}
            className="bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700 transition-colors">
            Converter em OS
        </button>
    )
}

// src/app/dashboard/clients/client-form-client.tsx

'use client'

import React, { useState } from 'react'
import { createClient, consultCnpj } from './actions'

// Componente simples para o formulário de cadastro de clientes
export default function ClientFormClient() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [formData, setFormData] = useState({ name: '', document: '', email: '', phone: '' })

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, document: e.target.value }))
        // Limpar o formulário se o usuário estiver digitando
        if (e.target.value.length < 14) {
            setFormData(prev => ({ ...prev, name: '', email: '' }))
        }
    }

    const handleConsultCnpj = async () => {
        if (formData.document.length < 14) return alert('Insira um CNPJ válido (14 dígitos).')

        setStatus('loading')
        const result = await consultCnpj(formData.document)
        
        if (result.success) {
            const data = result.data
            setFormData({
                name: data.razao_social || data.nome_fantasia || '',
                document: data.cnpj || formData.document,
                email: data.email || '',
                phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : '',
            })
            setStatus('success')
            alert(`CNPJ consultado com sucesso! Dados preenchidos.`)
        } else {
            setStatus('error')
            alert(result.message || 'Falha na consulta do CNPJ.')
        }
        setStatus('idle')
    }
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const data = new FormData(form);

        setStatus('loading')
        const result = await createClient(data)
        
        if (result.success) {
            alert(result.message) 
            setFormData({ name: '', document: '', email: '', phone: '' }) // Limpa o formulário
        } else {
            alert(result.message || 'Erro desconhecido ao salvar.')
        }
        setStatus('idle')
    }


    return (
        <form onSubmit={handleFormSubmit} className="p-4 border rounded shadow-md space-y-4 bg-white text-black">
            <h2 className="text-xl font-bold">Cadastrar Novo Cliente</h2>
            
            {/* Campo de CNPJ com Botão de Consulta */}
            <div className="flex space-x-2 items-end">
                <div className="flex-grow">
                    <label className="block text-sm font-medium">CNPJ/CPF</label>
                    <input 
                        name="document" 
                        required 
                        className="w-full p-2 border rounded"
                        value={formData.document}
                        onChange={handleCnpjChange}
                    />
                </div>
                <button 
                    type="button" 
                    onClick={handleConsultCnpj} 
                    disabled={status === 'loading'}
                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                    {status === 'loading' ? 'Consultando...' : 'Consultar CNPJ'}
                </button>
            </div>

            {/* Outros Campos (controlados por estado) */}
            <div>
                <label className="block text-sm font-medium">Razão Social / Nome</label>
                <input 
                    name="name" 
                    required 
                    className="w-full p-2 border rounded" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium">Email</label>
                <input 
                    name="email" 
                    type="email"
                    className="w-full p-2 border rounded" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Telefone</label>
                <input 
                    name="phone" 
                    className="w-full p-2 border rounded" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
            </div>
            
            <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 w-full">
                Salvar Cliente
            </button>
        </form>
    )
}
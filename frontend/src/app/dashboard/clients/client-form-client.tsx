'use client'

import React, { useState, useTransition } from 'react'
import { createClient, consultCnpj } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type Status = {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export default function ClientFormClient() {
    const [isCnpjLoading, startCnpjTransition] = useTransition();
    const [isSubmitLoading, startSubmitTransition] = useTransition();
    const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
    const [formData, setFormData] = useState({ name: '', document: '', email: '', phone: '' });

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        setFormData(prev => ({ ...prev, document: value }));
        if (value.length < 14) {
            setFormData(prev => ({ ...prev, name: '', email: '', phone: '' }));
        }
    }

    const handleConsultCnpj = () => {
        if (formData.document.length !== 14) {
            setStatus({type: 'error', message: 'Insira um CNPJ válido (14 dígitos).'});
            return;
        }

        startCnpjTransition(async () => {
            setStatus({ type: 'loading', message: 'Consultando...' });
            const result = await consultCnpj(formData.document);
            
            if (result.success) {
                const data = result.data;
                setFormData({
                    name: data.razao_social || data.nome_fantasia || '',
                    document: data.cnpj || formData.document,
                    email: data.email || '',
                    phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : '',
                });
                setStatus({ type: 'success', message: 'CNPJ consultado com sucesso!' });
            } else {
                setStatus({ type: 'error', message: result.message || 'Falha na consulta do CNPJ.' });
            }
        });
    }
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const data = new FormData(form);

        startSubmitTransition(async () => {
            setStatus({ type: 'loading', message: 'Salvando cliente...' });
            const result = await createClient(data);
            
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
                setFormData({ name: '', document: '', email: '', phone: '' }); // Clear form
                form.reset();
            } else {
                setStatus({ type: 'error', message: result.message || 'Erro ao salvar cliente.' });
            }
        });
    }

    const isLoading = isCnpjLoading || isSubmitLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cadastrar Novo Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="document">CNPJ/CPF</Label>
                        <div className="flex space-x-2">
                            <Input 
                                id="document"
                                name="document" 
                                required 
                                value={formData.document}
                                onChange={handleCnpjChange}
                                placeholder="Apenas números"
                                maxLength={14}
                            />
                            <Button 
                                type="button" 
                                variant="secondary"
                                onClick={handleConsultCnpj} 
                                disabled={isLoading || formData.document.length !== 14}
                            >
                                {isCnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Consultar'}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Razão Social / Nome</Label>
                        <Input 
                            id="name"
                            name="name" 
                            required 
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email"
                            name="email" 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input 
                            id="phone"
                            name="phone" 
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isSubmitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSubmitLoading ? 'Salvando...' : 'Salvar Cliente'}
                    </Button>

                    {status.type !== 'idle' && (
                         <p className={`text-sm text-center ${
                            status.type === 'error' ? 'text-destructive' :
                            status.type === 'success' ? 'text-green-500' :
                            'text-muted-foreground'
                        }`}>
                            {status.message}
                        </p>
                    )}
                </form>
            </CardContent>
        </Card>
    )
}

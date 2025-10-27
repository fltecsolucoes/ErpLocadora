// src/app/dashboard/admin/permissions/page.tsx

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

// Importa as funções de busca e verificação de permissão
import { getRbacData, checkPermission, type RbacData } from './actions' 
// Importa o componente cliente da tabela
import PermissionTableClient from './permission-table-client'

// ====================================================================
// COMPONENTE PRINCIPAL (SERVER COMPONENT)
// ====================================================================

export default async function PermissionsAdminPage() {
    // 1. Verificar Autenticação
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect('/login') 
    }

    // 2. Verificar AUTORIZAÇÃO (Permissão específica)
    // Chamamos a função 'checkPermission' que criamos em actions.ts
    const canManageRoles = await checkPermission('manage:roles') 
    if (!canManageRoles) {
        // Se o usuário não tem a permissão, redireciona para o dashboard principal
        // Poderíamos mostrar uma mensagem de "Acesso Negado" também
        return redirect('/dashboard') 
    }

    // 3. Buscar os Dados Iniciais (Roles, Permissions, Relações)
    // Somente se o usuário passou na verificação acima
    const rbacData = await getRbacData()


    return (
        <div className="p-8 space-y-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-3">
                Administração - Gestão de Funções e Permissões (RBAC)
            </h1>

            {/* Renderiza o Componente Cliente, passando os dados */}
            <PermissionTableClient initialData={rbacData} />

            <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
                <strong>Atenção:</strong> Alterar permissões pode impactar o acesso dos usuários ao sistema. Tenha certeza das suas alterações antes de salvar.
            </div>
        </div>
    )
}
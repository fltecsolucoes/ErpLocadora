// src/app/dashboard/admin/permissions/actions.ts

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

// Tipagens
type Role = Database['public']['Tables']['roles']['Row']
type Permission = Database['public']['Tables']['permissions']['Row']
type RolePermission = Database['public']['Tables']['role_permissions']['Row']

// --- HELPER: Cria o cliente Supabase ---
// --- HELPER: Cria o cliente Supabase ---
function getSupabaseServerClient() {
    const cookieStore = cookies()
    // SUBSTITUA o comentário por esta configuração completa:
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options) { cookieStore.set(name, value, options) },
                remove(name: string, options) { cookieStore.set(name, '', options) },
            },
        }
    )
}


// ====================================================================
// 1. AÇÃO PARA BUSCAR TODOS OS DADOS RBAC
// ====================================================================
export interface RbacData {
    roles: Role[];
    permissions: Permission[];
    rolePermissions: RolePermission[]; // Relação M-N atual
}

export async function getRbacData(): Promise<RbacData> {
    const supabase = getSupabaseServerClient()

    // Somente usuários com 'manage:roles' podem chamar isso (indiretamente via RLS da página)
    
    const [rolesRes, permissionsRes, rolePermissionsRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('permissions').select('*').order('slug'),
        supabase.from('role_permissions').select('*') // Busca todas as ligações
    ])

    if (rolesRes.error || permissionsRes.error || rolePermissionsRes.error) {
        console.error('Erro ao buscar dados RBAC:', rolesRes.error, permissionsRes.error, rolePermissionsRes.error)
        return { roles: [], permissions: [], rolePermissions: [] }
    }

    return {
        roles: rolesRes.data as Role[],
        permissions: permissionsRes.data as Permission[],
        rolePermissions: rolePermissionsRes.data as RolePermission[]
    }
}

// ====================================================================
// 2. AÇÃO PARA ATUALIZAR AS PERMISSÕES DE UMA ROLE (FUNÇÃO)
// ====================================================================

export async function updateRolePermissions(roleId: number, permissionIds: number[]) {
    const supabase = getSupabaseServerClient()

    // 1. Deleta todas as permissões antigas desta Role
    const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

    if (deleteError) {
        console.error(`Erro ao deletar permissões antigas da role ${roleId}:`, deleteError)
        return { success: false, message: `Erro ao limpar permissões: ${deleteError.message}` }
    }

    // 2. Insere as novas permissões (se houver alguma)
    if (permissionIds.length > 0) {
        const newPermissionsData = permissionIds.map(permId => ({
            role_id: roleId,
            permission_id: permId
        }))

        const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(newPermissionsData)

        if (insertError) {
            console.error(`Erro ao inserir novas permissões para a role ${roleId}:`, insertError)
            return { success: false, message: `Erro ao adicionar novas permissões: ${insertError.message}` }
        }
    }

    // Revalida a página para mostrar as alterações
    revalidatePath('/dashboard/admin/permissions')
    return { success: true, message: 'Permissões atualizadas com sucesso!' }
}

// ====================================================================
// 3. FUNÇÃO AUXILIAR PARA VERIFICAR PERMISSÃO (COPIADA DA FASE 3)
// ====================================================================
// Esta função é chamada pela PÁGINA para garantir acesso
export async function checkPermission(permissionSlug: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verificar se o usuário tem a permissão via RPC ou consulta direta (como na Fase 3)
    // Simplificado aqui - a consulta original era mais complexa
    const { data, error } = await supabase
        .rpc('check_permission', { p_permission_slug: permissionSlug }) // Assumindo que a RPC existe e funciona

    if (error) {
        console.error('Erro ao chamar RPC check_permission:', error);
        return false;
    }
    
    return data === true;
}
import { getRbacData, checkPermission } from './actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import PermissionTableClient from './permission-table-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'

export default async function PermissionsAdminPage() {
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

    const canManageRoles = await checkPermission('manage:roles') 
    if (!canManageRoles) {
        return redirect('/dashboard') 
    }

    const rbacData = await getRbacData()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Gestão de Permissões</h1>
                <p className="text-muted-foreground">Controle o que cada função de usuário pode acessar e fazer no sistema.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Matriz de Funções e Permissões</CardTitle>
                    <CardDescription>Marque as caixas para conceder permissões a uma função. As alterações são salvas por coluna.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PermissionTableClient initialData={rbacData} />
                </CardContent>
            </Card>

            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                    Alterar permissões pode impactar criticamente o acesso dos usuários. Tenha certeza das suas alterações antes de salvar.
                </AlertDescription>
            </Alert>
        </div>
    )
}

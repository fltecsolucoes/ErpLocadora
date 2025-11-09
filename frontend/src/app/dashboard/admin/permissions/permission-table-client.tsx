'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { updateRolePermissions, type RbacData } from './actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PermissionTableProps {
    initialData: RbacData;
}

type RolePermissionState = {
    [roleId: number]: number[];
}

export default function PermissionTableClient({ initialData }: PermissionTableProps) {
    const { roles, permissions, rolePermissions } = initialData;

    const [checkedState, setCheckedState] = useState<RolePermissionState>({});
    const [isPending, startTransition] = useTransition();
    const [savingRoleId, setSavingRoleId] = useState<number | null>(null);

    useEffect(() => {
        const initialState: RolePermissionState = {};
        roles.forEach(role => {
            initialState[role.id] = rolePermissions
                .filter(rp => rp.role_id === role.id)
                .map(rp => rp.permission_id);
        });
        setCheckedState(initialState);
    }, [roles, rolePermissions]);

    const handleCheckboxChange = (roleId: number, permissionId: number) => {
        setCheckedState(prevState => {
            const currentPermissions = prevState[roleId] || [];
            const isChecked = currentPermissions.includes(permissionId);
            
            if (isChecked) {
                return { ...prevState, [roleId]: currentPermissions.filter(id => id !== permissionId) };
            } else {
                return { ...prevState, [roleId]: [...currentPermissions, permissionId] };
            }
        });
    }

    const handleSaveChanges = async (roleId: number) => {
        setSavingRoleId(roleId);
        startTransition(async () => {
            const permissionIdsToSave = checkedState[roleId] || [];
            const result = await updateRolePermissions(roleId, permissionIdsToSave);

            if (!result.success) {
                // Idealmente, usar um toast para notificação de erro
                alert(`Erro: ${result.message}`);
            }
            setSavingRoleId(null);
        });
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]">Permissão</TableHead>
                        {roles.map(role => (
                            <TableHead key={role.id} className="text-center">
                                {role.name}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {permissions.map(permission => (
                        <TableRow key={permission.id}>
                            <TableCell className="font-medium">{permission.slug}</TableCell>
                            {roles.map(role => (
                                <TableCell key={`${role.id}-${permission.id}`} className="text-center">
                                    <Checkbox
                                        checked={checkedState[role.id]?.includes(permission.id) || false}
                                        onCheckedChange={() => handleCheckboxChange(role.id, permission.id)}
                                        id={`check-${role.id}-${permission.id}`}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
                <tfoot>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell className="font-medium">Ações</TableCell>
                        {roles.map(role => (
                            <TableCell key={`save-${role.id}`} className="text-center">
                                <Button
                                    size="sm"
                                    onClick={() => handleSaveChanges(role.id)}
                                    disabled={isPending && savingRoleId === role.id}
                                >
                                    {isPending && savingRoleId === role.id ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : 'Salvar'}
                                </Button>
                            </TableCell>
                        ))}
                    </TableRow>
                </tfoot>
            </Table>
        </div>
    )
}

// src/app/dashboard/admin/permissions/permission-table-client.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { updateRolePermissions, type RbacData } from './actions' // Importa a ação de salvar

// Define as propriedades que este componente recebe
interface PermissionTableProps {
    initialData: RbacData; // Os dados buscados pelo Server Component
}

// Define um tipo para o estado local que gerencia os checkboxes
// Ex: { roleId1: [permissionId1, permissionId3], roleId2: [permissionId2] }
type RolePermissionState = {
    [roleId: number]: number[]; // Mapeia ID da Role para um array de IDs de Permissão
}

export default function PermissionTableClient({ initialData }: PermissionTableProps) {
    const { roles, permissions, rolePermissions } = initialData;

    // Estado local para gerenciar os checkboxes marcados para cada role
    const [checkedState, setCheckedState] = useState<RolePermissionState>({});
    // Estado para feedback de salvamento
    const [savingStates, setSavingStates] = useState<{ [roleId: number]: boolean }>({});

    // Efeito para inicializar o estado dos checkboxes com base nos dados recebidos
    useEffect(() => {
        const initialState: RolePermissionState = {};
        roles.forEach(role => {
            // Filtra as permissões existentes para esta role específica
            initialState[role.id] = rolePermissions
                .filter(rp => rp.role_id === role.id)
                .map(rp => rp.permission_id);
        });
        setCheckedState(initialState);
    }, [roles, rolePermissions]); // Re-executa se os dados mudarem

    // Função chamada quando um checkbox é clicado
    const handleCheckboxChange = (roleId: number, permissionId: number, isChecked: boolean) => {
        setCheckedState(prevState => {
            const currentPermissions = prevState[roleId] || [];
            if (isChecked) {
                // Adiciona a permissão se não estiver lá
                return { ...prevState, [roleId]: [...currentPermissions, permissionId] };
            } else {
                // Remove a permissão
                return { ...prevState, [roleId]: currentPermissions.filter(id => id !== permissionId) };
            }
        });
    }

    // Função chamada ao clicar no botão "Salvar" de uma role
    const handleSaveChanges = async (roleId: number) => {
        setSavingStates(prev => ({ ...prev, [roleId]: true })); // Ativa o estado de "salvando"

        const permissionIdsToSave = checkedState[roleId] || [];
        const result = await updateRolePermissions(roleId, permissionIdsToSave);

        if (result.success) {
            alert(result.message); // Idealmente usar um Toast
        } else {
            alert(`Erro ao salvar: ${result.message}`);
            // Poderíamos reverter o estado aqui se o salvamento falhar
        }
        setSavingStates(prev => ({ ...prev, [roleId]: false })); // Desativa o "salvando"
    }

    // Renderização da Tabela/Matriz
    return (
        <div className="overflow-x-auto bg-white text-gray-800 p-4 rounded shadow-md border">
            <h2 className="text-xl font-semibold mb-4">Matriz de Permissões</h2>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Permissão</th>
                        {/* Cria uma coluna para cada Role */}
                        {roles.map(role => (
                            <th key={role.id} className="px-4 py-2 text-center font-medium text-gray-600">
                                {role.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {/* Cria uma linha para cada Permissão */}
                    {permissions.map(permission => (
                        <tr key={permission.id}>
                            <td className="px-4 py-2 font-medium">{permission.slug}</td>
                            {/* Cria um checkbox para cada combinação Role x Permissão */}
                            {roles.map(role => (
                                <td key={`${role.id}-${permission.id}`} className="px-4 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        // Verifica se a permissão está no estado 'checkedState' para esta role
                                        checked={checkedState[role.id]?.includes(permission.id) || false}
                                        // Atualiza o estado quando o checkbox muda
                                        onChange={(e) => handleCheckboxChange(role.id, permission.id, e.target.checked)}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                {/* Rodapé com Botões de Salvar */}
                <tfoot>
                    <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-left font-medium text-gray-600">Ações</td>
                        {roles.map(role => (
                            <td key={`save-${role.id}`} className="px-4 py-3 text-center">
                                <button
                                    onClick={() => handleSaveChanges(role.id)}
                                    disabled={savingStates[role.id]} // Desabilita enquanto salva
                                    className="bg-green-600 text-white px-3 py-1 text-xs rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                >
                                    {savingStates[role.id] ? 'Salvando...' : 'Salvar'}
                                </button>
                            </td>
                        ))}
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}
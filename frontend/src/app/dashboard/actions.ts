'use server'

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

// --- HELPER: Cria o cliente Supabase no Servidor ---
function getSupabaseServerClient() {
    const cookieStore = cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) { 
                    try { cookieStore.set(name, value, options) } catch (error) {/* Ignora */} 
                },
                remove(name: string, options: CookieOptions) { 
                    try { cookieStore.set(name, '', options) } catch (error) {/* Ignora */} 
                },
            },
        }
    )
}

export interface DashboardKpis {
    monthlyRevenue: number;
    newClients: number;
    activeOrders: number;
    checkedOutItems: number;
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
    const supabase = getSupabaseServerClient();

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

    // 1. Faturamento do Mês (Pagamentos com status 'Paid' no mês corrente)
    const { data: revenueData, error: revenueError } = await supabase
        .from('order_payments')
        .select('amount')
        .eq('status', 'Paid')
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);
        
    if (revenueError) console.error('Error fetching monthly revenue:', revenueError);
    const monthlyRevenue = revenueData?.reduce((sum, item) => sum + parseFloat(item.amount as unknown as string), 0) || 0;

    // 2. Novos Clientes no Mês
    const { count: newClients, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);

    if (clientsError) console.error('Error fetching new clients:', clientsError);

    // 3. OS Ativas (Status 'Reserved' ou 'CheckedOut')
    const { count: activeOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Reserved', 'CheckedOut']);
    
    if (ordersError) console.error('Error fetching active orders:', ordersError);

    // 4. Itens em Locação (Status 'CheckedOut')
    const { data: checkedOutData, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity')
        .eq('status', 'CheckedOut');

    if (itemsError) console.error('Error fetching checked out items:', itemsError);
    const checkedOutItems = checkedOutData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return {
        monthlyRevenue,
        newClients: newClients ?? 0,
        activeOrders: activeOrders ?? 0,
        checkedOutItems,
    };
}


// --- ATIVIDADE RECENTE ---
export type ActivityItem = {
  id: string;
  type: 'client' | 'quote' | 'order';
  description: string;
  timestamp: string;
  link: string;
};

export async function getRecentActivity(): Promise<ActivityItem[]> {
    const supabase = getSupabaseServerClient();
    const limit = 5;

    const [clientsRes, quotesRes, ordersRes] = await Promise.all([
        supabase.from('clients').select('id, name, created_at').order('created_at', { ascending: false }).limit(limit),
        supabase.from('quotes').select('id, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(limit),
        supabase.from('orders').select('id, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(limit)
    ]);

    const activities: ActivityItem[] = [];

    clientsRes.data?.forEach(c => activities.push({
        id: c.id,
        type: 'client',
        description: `Novo cliente: ${c.name}`,
        timestamp: c.created_at,
        link: '/dashboard/clients'
    }));

    quotesRes.data?.forEach(q => activities.push({
        id: q.id,
        type: 'quote',
        description: `Orçamento #${q.id.substring(0,4)} para ${q.client?.name || 'N/A'}`,
        timestamp: q.created_at,
        link: '/dashboard/quotes'
    }));

    ordersRes.data?.forEach(o => activities.push({
        id: o.id,
        type: 'order',
        description: `OS #${o.id.substring(0,4)} para ${o.client?.name || 'N/A'}`,
        timestamp: o.created_at,
        link: `/dashboard/orders/${o.id}`
    }));

    return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 7); // Pega as 7 atividades mais recentes no geral
}

// --- DEVOLUÇÕES PRÓXIMAS ---
export type UpcomingReturn = {
  order_id: string;
  client_name: string | null;
  end_date: string;
  item_count: number;
};

export async function getUpcomingReturns(): Promise<UpcomingReturn[]> {
    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('order_items')
        .select(`
            order_id,
            end_date,
            order:orders(client:clients(name))
        `)
        .eq('status', 'CheckedOut')
        .gte('end_date', today)
        .lte('end_date', nextWeek)
        .order('end_date', { ascending: true });

    if (error) {
        console.error('Error fetching upcoming returns:', error);
        return [];
    }

    // Agrupar itens por OS
    const groupedByOrder: Record<string, UpcomingReturn> = {};
    data.forEach(item => {
        if (!groupedByOrder[item.order_id]) {
            groupedByOrder[item.order_id] = {
                order_id: item.order_id,
                client_name: item.order?.client?.name || 'Cliente não encontrado',
                end_date: item.end_date,
                item_count: 0
            };
        }
        groupedByOrder[item.order_id].item_count += 1;
    });

    return Object.values(groupedByOrder);
}

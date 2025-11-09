import { getDashboardKpis, getRecentActivity, getUpcomingReturns } from './actions';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RecentActivityFeed } from '@/components/dashboard/recent-activity-feed';
import { UpcomingReturnsList } from '@/components/dashboard/upcoming-returns-list';
import { DollarSign, Users, ClipboardList, Package } from 'lucide-react';

export default async function Dashboard() {
  const [kpis, recentActivity, upcomingReturns] = await Promise.all([
    getDashboardKpis(),
    getRecentActivity(),
    getUpcomingReturns()
  ]);

  const kpiData = [
    { 
      title: "Faturamento (Mês)", 
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.monthlyRevenue), 
      icon: DollarSign, 
      description: "Receita de pagamentos confirmados." 
    },
    { 
      title: "Novos Clientes (Mês)", 
      value: `+${kpis.newClients}`, 
      icon: Users, 
      description: "Clientes cadastrados no mês atual." 
    },
    { 
      title: "OS Ativas", 
      value: kpis.activeOrders.toString(), 
      icon: ClipboardList, 
      description: "Ordens de serviço em andamento." 
    },
    { 
      title: "Itens em Locação", 
      value: kpis.checkedOutItems.toString(), 
      icon: Package, 
      description: "Total de itens com status 'Check-Out'." 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio em tempo real.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <KpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            description={kpi.description}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivityFeed activities={recentActivity} />
        <UpcomingReturnsList returns={upcomingReturns} />
      </div>
    </div>
  )
}

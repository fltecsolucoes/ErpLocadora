'use client'

import Link from 'next/link'
import { ActivityItem } from '@/app/dashboard/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, UserPlus, FileText, ClipboardCheck } from 'lucide-react'

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

const iconMap = {
  client: UserPlus,
  quote: FileText,
  order: ClipboardCheck,
};

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos atrás";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses atrás";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dias atrás";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas atrás";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutos atrás";

    return "Agora mesmo";
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center space-x-4">
        <Activity className="h-6 w-6 text-muted-foreground" />
        <div>
          <CardTitle>Atividade Recente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>Nenhuma atividade recente para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = iconMap[activity.type];
              return (
                <Link href={activity.link} key={activity.id} className="flex items-start space-x-4 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="p-2 bg-secondary rounded-full">
                    <Icon className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

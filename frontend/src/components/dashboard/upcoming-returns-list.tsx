'use client'

import Link from 'next/link'
import { UpcomingReturn } from '@/app/dashboard/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, PackageOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface UpcomingReturnsListProps {
  returns: UpcomingReturn[];
}

function formatDate(dateString: string) {
    const date = new Date(dateString + 'T00:00:00'); // Treat as local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) {
        return { label: 'Hoje', variant: 'destructive' as const };
    }
    if (date.getTime() === tomorrow.getTime()) {
        return { label: 'Amanhã', variant: 'secondary' as const };
    }
    return { label: date.toLocaleDateString('pt-BR'), variant: 'outline' as const };
}


export function UpcomingReturnsList({ returns }: UpcomingReturnsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-4">
        <Clock className="h-6 w-6 text-muted-foreground" />
        <div>
          <CardTitle>Devoluções Próximas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {returns.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>Nenhuma devolução nos próximos 7 dias.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((item) => {
                const dateInfo = formatDate(item.end_date);
                return (
                    <Link href={`/dashboard/orders/${item.order_id}`} key={item.order_id} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="p-2 bg-secondary rounded-full">
                            <PackageOpen className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{item.client_name}</p>
                            <p className="text-xs text-muted-foreground">{item.item_count} item(ns) na OS #{item.order_id.substring(0,4)}</p>
                        </div>
                        <Badge variant={dateInfo.variant}>{dateInfo.label}</Badge>
                    </Link>
                )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

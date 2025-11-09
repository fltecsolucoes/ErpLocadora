import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Bem-vindo ao ERP de Locação
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Gerencie seus clientes, inventário, orçamentos e ordens de serviço de forma integrada e eficiente.
        </p>
        <div>
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center h-12 px-8 py-3 font-medium text-background bg-primary rounded-md transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Acessar o Sistema
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}

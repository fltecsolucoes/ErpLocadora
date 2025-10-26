// src/middleware.ts (CORREÇÃO FINAL)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type CookieOptions } from '@supabase/ssr' // Importe o CookieOptions

export async function middleware(request: NextRequest) {

  // Crie o cliente Supabase DENTRO do middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Ação de 'set' precisa de uma resposta
          request.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // Ação de 'remove' precisa de uma resposta
          request.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // O único trabalho do middleware é atualizar a sessão (refresh token)
  await supabase.auth.getSession()

  // Continue a requisição
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico (ícone)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
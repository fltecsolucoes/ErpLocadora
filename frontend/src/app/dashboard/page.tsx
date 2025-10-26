// src/app/dashboard/page.tsx (CORREÇÃO FINAL MESMO)
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { type CookieOptions } from '@supabase/ssr' 

export default async function Dashboard() {
  
  // 1. Chame cookies() UMA VEZ no topo.
  const cookieStore = cookies()

  // 2. Crie o cliente Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 3. REUSE a variável cookieStore aqui
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, '', options)
        },
      },
    }
  )

  // 4. Tenta pegar a sessão do usuário
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Se não houver usuário, protege a rota
  if (!user) {
    return redirect('/login') 
  }

  // 6. Ação de Logout (Server Action)
  const signOut = async () => {
    'use server'

    // Chame cookies() UMA VEZ no topo da Server Action
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )
    await supabase.auth.signOut()
    return redirect('/login')
  }


  // 7. Se houver usuário, mostra a página
  return (
    <div style={{ width: '300px', margin: '100px auto' }}>
      <h1>Dashboard (Protegido)</h1>
      <p>Olá, {user.email}</p>
      
      <form>
        <button formAction={signOut}
                style={{ width: '100%', background: 'red', color: 'white' }}>
          Sair
        </button>
      </form>
    </div>
  )
}
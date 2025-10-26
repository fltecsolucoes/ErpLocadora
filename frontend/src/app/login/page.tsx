// src/app/login/page.tsx (CORREÇÃO FINAL MESMO)
import { cookies } from 'next/headers' 
import { createServerClient } from '@supabase/ssr' 
import { redirect } from 'next/navigation'

export default function Login() {
  
  // Ação de Login (Server Action)
  const signIn = async (formData: FormData) => {
    'use server' 

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    // 1. Chame cookies() UMA VEZ no topo da Server Action
    const cookieStore = cookies() 
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // 2. REUSE a variável cookieStore aqui
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(error)
      return redirect('/login?error=Login falhou')
    }

    return redirect('/dashboard')
  }

  return (
    <div style={{ width: '300px', margin: '100px auto' }}>
      <h1>Login</h1>
      <form>
        <label htmlFor="email">Email:</label>
        <input id="email" name="email" type="email" required 
               style={{ width: '100%', border: '1px solid #ccc' }} />
        
        <label htmlFor="password">Senha:</label>
        <input id="password" name="password" type="password" required 
               style={{ width: '100%', border: '1px solid #ccc' }} />
        
        <button formAction={signIn} 
                style={{ width: '100%', marginTop: '10px', background: 'blue', color: 'white' }}>
          Entrar
        </button>
      </form>
    </div>
  )
}
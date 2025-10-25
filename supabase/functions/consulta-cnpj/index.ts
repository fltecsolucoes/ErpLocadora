import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Define os headers de CORS para permitir que seu frontend chame esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, mude para seu domínio
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Tratar requisição OPTIONS (pré-voo de CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Obter o CNPJ enviado pelo frontend no corpo (body) da requisição
    const { cnpj } = await req.json()
    if (!cnpj) {
      throw new Error('CNPJ é obrigatório.')
    }

    // 3. Limpar o CNPJ (remover pontos, barras, etc.)
    const cleanedCnpj = String(cnpj).replace(/\D/g, '')

    // 4. Chamar uma API pública e gratuita (BrasilAPI)
    // (Em um caso real, você pode querer usar uma API paga e mais robusta)
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Falha ao consultar CNPJ na BrasilAPI: ${errorData.message}`)
    }

    const data = await response.json()

    // 5. Retornar os dados do cliente para o frontend
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // 6. Tratar erros
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
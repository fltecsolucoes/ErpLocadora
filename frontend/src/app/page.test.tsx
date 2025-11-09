import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from './page'

describe('Página Inicial (Home)', () => {
  it('deve renderizar o título principal corretamente', () => {
    render(&lt;Home /&gt;)

    // Procura por um elemento de cabeçalho (h1, h2, etc.) com o texto específico.
    const heading = screen.getByRole('heading', {
      name: /Bem-vindo ao ERP de Locação/i,
    })

    // Verifica se o elemento foi encontrado no documento.
    expect(heading).toBeInTheDocument()
  })

  it('deve renderizar o link para acessar o sistema', () => {
    render(&lt;Home /&gt;)

    // Procura por um link com o texto "Acessar o Sistema".
    const link = screen.getByRole('link', { name: /Acessar o Sistema/i })

    // Verifica se o link foi encontrado.
    expect(link).toBeInTheDocument()
    
    // Verifica se o link aponta para o dashboard.
    expect(link).toHaveAttribute('href', '/dashboard')
  })
})

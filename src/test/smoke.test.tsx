import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '@/app/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
  }),
}))

describe('Home page', () => {
  it('renders the login form', () => {
    render(<Page />)
    expect(screen.getByRole('img', { name: 'Inshop' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Sign In' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
  })
})

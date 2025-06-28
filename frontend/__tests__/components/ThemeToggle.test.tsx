import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ThemeProvider } from '@/components/ThemeProvider'

// Helper function to render with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset document class
    document.documentElement.classList.remove('dark')
    // Reset localStorage mock
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
  })

  it('renders with light theme by default', () => {
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /switch to dark theme/i })
    expect(button).toBeInTheDocument()
    
    const moonIcon = screen.getByRole('button').querySelector('svg')
    expect(moonIcon).toBeInTheDocument()
  })

  it('toggles theme when clicked', () => {
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /switch to dark theme/i })
    
    fireEvent.click(button)
    
    // Should now show light theme button
    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument()
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('loads theme from localStorage on mount', () => {
    ;(localStorage.getItem as jest.Mock).mockReturnValue('dark')
    
    renderWithTheme(<ThemeToggle />)
    
    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('shows icon and label on desktop', () => {
    // Ensure we start with light theme
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Dark')
  })

  it('has proper accessibility attributes', () => {
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label')
    expect(button.getAttribute('aria-label')).toMatch(/switch to .* theme/i)
  })

  it('applies theme to document element', () => {
    // Ensure we start with light theme
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
}) 
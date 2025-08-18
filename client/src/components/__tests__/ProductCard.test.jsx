import { render, screen } from '@testing-library/react'
import React from 'react'

function App() {
  return <h1>Hello, world!</h1>
}

test('renders greeting', () => {
  render(<App />)
  expect(screen.getByText(/hello, world!/i)).toBeInTheDocument()
})

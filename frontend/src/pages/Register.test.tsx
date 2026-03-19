import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
import { authService } from '../services/authService';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));
jest.mock('../services/authService');

describe('Register page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step 1 with restaurant information form', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Create Restaurant Account/i })).toBeInTheDocument();
    expect(screen.getByText(/Restaurant Information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Restaurant Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Restaurant Type \/ Cuisine/i)).toBeInTheDocument();
  });

  it('shows validation error when clicking Next without restaurant name', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    const nextButton = screen.getByRole('button', { name: /Next: Create Admin Account/i });
    await userEvent.click(nextButton);
    expect(screen.getByText(/Please enter restaurant name/i)).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('shows validation error when cuisine type not selected', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByPlaceholderText(/e.g. Tandoori Nights/i), 'My Restaurant');
    const nextButton = screen.getByRole('button', { name: /Next: Create Admin Account/i });
    await userEvent.click(nextButton);
    expect(screen.getByText(/Please select cuisine type/i)).toBeInTheDocument();
  });
});

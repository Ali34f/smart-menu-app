import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
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

const renderLogin = () => {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
};

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/ })).toBeInTheDocument();
  });

  it('shows validation error when submitting empty form', async () => {
    renderLogin();
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/ });
    await userEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
    });
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('shows validation error when only email is filled', async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@restaurant\.com/i), 'owner@test.com');
    await userEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));
    await waitFor(() => {
      expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
    });
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('calls authService.login with credentials on submit', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      user: { invitationAccepted: true },
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@restaurant\.com/i), 'owner@test.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'owner@test.com',
        password: 'password123',
      });
    });
  });

  it('shows error message when login fails with 401', async () => {
    (authService.login as jest.Mock).mockRejectedValue({
      response: { status: 401 },
    });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@restaurant\.com/i), 'wrong@test.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});

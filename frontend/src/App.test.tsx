import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    }),
  },
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders app and shows login when unauthenticated', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
  });

  it('renders sign in form on login route', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^Sign In$/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@restaurant\.com/i)).toBeInTheDocument();
  });
});

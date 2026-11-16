import axios from 'axios';
import { getBaseUrl } from './config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 
                (process.env.NEXT_PUBLIC_LARAVEL_URL ? `${process.env.NEXT_PUBLIC_LARAVEL_URL}/api` : `${getBaseUrl()}/api`);
const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || getBaseUrl();

export async function checkAuth(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_URL}/customer/dashboard`, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' },
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(`${LARAVEL_URL}/login`, {
      email,
      password,
    }, {
      withCredentials: true,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    return { success: response.status === 200 || response.status === 204 };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || 'Login failed',
    };
  }
}

export async function logout(): Promise<void> {
  try {
    await axios.post(`${LARAVEL_URL}/logout`, {}, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}


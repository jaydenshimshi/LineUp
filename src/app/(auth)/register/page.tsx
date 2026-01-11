/**
 * Registration page
 */

import { RegisterForm } from '@/components/auth/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}

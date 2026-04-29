'use client';

import { Button } from '../ui/button';
import { useAuth } from '../providers/auth';

type SignoutButtonProps = {
  children?: React.ReactNode;
};

export function SignoutButton({
  children = 'Voltar para Login',
}: SignoutButtonProps) {
  const { signOut } = useAuth();

  return <Button onClick={signOut}>{children}</Button>;
}

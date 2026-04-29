import { ReactNode } from 'react';

type TrpcProviderProps = {
  children: ReactNode;
};

// tRPC não está configurado neste projeto. Este provider é um passthrough.
export function TrpcProvider({ children }: TrpcProviderProps) {
  return <>{children}</>;
}

import { useAuth } from '../../components/providers/auth';
import { Topbar } from '../../components/layout/app-topbar';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <Topbar />
      <div className="container mx-auto max-w-screen-xl px-10">
        <header className="py-5">
          <h1 className="text-3xl font-semibold">
            Seja bem-vindo, {user.name}!
          </h1>
        </header>
      </div>
    </>
  );
}

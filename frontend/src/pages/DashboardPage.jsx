import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back, {user?.email}
        </p>
      </div>
      <div className="border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Dashboard content will be added in the next commit.
        </p>
      </div>
    </div>
  );
}

import { requireKaryakar } from '@/lib/auth.server';
import { AppHeader } from '@/components/ui/AppHeader';
import { TabBar } from '@/components/ui/TabBar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce auth session and password change rules
  await requireKaryakar();

  return (
    <div className="min-h-screen bg-paper flex flex-col max-w-[600px] mx-auto relative">
      <AppHeader />
      <main className="flex-1 p-4 pb-[116px]">{children}</main>
      <TabBar />
    </div>
  );
}

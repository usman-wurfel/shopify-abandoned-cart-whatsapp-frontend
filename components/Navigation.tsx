'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface NavigationProps {
  children: React.ReactNode;
}

export default function AppNavigation({ children }: NavigationProps) {
  const pathname = usePathname();

  // Public routes that don't need sidebar (only /privacy-policy view page; edit page has sidebar)
  const publicRoutes = ['/login', '/set-password', '/privacy-policy'];
  const isPublicRoute = pathname && publicRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'));

  // Don't show navigation on public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto ml-64">
        {children}
      </main>
    </div>
  );
}


import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFound, Unauthorized } from '@/components/shared/NotFound';
import { Skeleton } from '@/components/ui/skeleton';

// Route-level code splitting keeps the first load small (recharts is the heavy one).
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'));
const Apply = lazy(() => import('@/features/leaves/ApplyPage'));
const Requests = lazy(() => import('@/features/leaves/RequestsPage'));
const Detail = lazy(() => import('@/features/leaves/RequestDetailPage'));
const Calendar = lazy(() => import('@/features/calendar/CalendarPage'));
const Audit = lazy(() => import('@/features/audit/AuditPage'));
const Notifications = lazy(() => import('@/features/notifications/NotificationsPage'));
const page = (el) => <Suspense fallback={<Skeleton className="h-6 w-48" />}>{el}</Suspense>;
const approvers = ['MANAGER', 'HOD'];

export const router = createBrowserRouter([
  { element: <AuthLayout />, children: [{ path: '/login', element: <LoginPage /> }] },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        { index: true, element: page(<Dashboard />) },
        { path: 'requests', element: page(<Requests scope="mine" />) },
        { path: 'requests/:id', element: page(<Detail />) },
        { path: 'calendar', element: page(<Calendar />) },
        { path: 'notifications', element: page(<Notifications />) },
        { path: 'unauthorized', element: <Unauthorized /> },
        {
          element: <ProtectedRoute roles={['EMPLOYEE', 'MANAGER']} />,
          children: [{ path: 'apply', element: page(<Apply />) }],
        },
        {
          element: <ProtectedRoute roles={approvers} />,
          children: [
            { path: 'approvals', element: page(<Requests scope="pending" />) },
            { path: 'team-requests', element: page(<Requests scope="team" />) },
            { path: 'audit', element: page(<Audit />) },
          ],
        },
        { path: '*', element: <NotFound /> },
      ],
    }],
  },
]);

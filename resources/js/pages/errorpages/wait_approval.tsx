import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes'
import { Head, Link, router } from '@inertiajs/react'
import React from 'react'

const WaitForApproval = () => {
  const cleanup = useMobileNavigation();

  const handleLogout = () => {
    cleanup();
    router.flushAll();
  };
  return (
    <>
      <Head title="Account Pending Approval" />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-yellow-100">
              <svg
                className="h-12 w-12 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Wait For Approval
            </h2>
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Current Status:</strong> {status === 'P' ? 'Pending' : status === 'R' ? 'Rejected' : 'Under Review'}
              </p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-4">
                If you have any questions, please contact our support team.
              </p>

              <Link
                className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer"
                href={logout()}
                as="button"
                onClick={handleLogout}
                data-test="logout-button">
                Go Back To Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default WaitForApproval
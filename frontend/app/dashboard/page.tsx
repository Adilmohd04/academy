import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

interface UserMetadata {
  role?: 'admin' | 'teacher' | 'student';
}

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  
  // Get user role from metadata (default to 'student')
  const role = (user?.publicMetadata as UserMetadata)?.role || 'student';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎓 EduPlatform
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.firstName || user.emailAddresses[0].emailAddress}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-2">
            Role: <span className="font-semibold capitalize">{role}</span>
          </p>
        </div>

        {/* Role-based Dashboard */}
        {role === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">My Courses</h3>
              <p className="text-gray-600">View your enrolled courses</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Schedule</h3>
              <p className="text-gray-600">Upcoming meetings</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Progress</h3>
              <p className="text-gray-600">Track your learning</p>
            </div>
          </div>
        )}

        {role === 'teacher' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">My Courses</h3>
              <p className="text-gray-600">Manage your courses</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Students</h3>
              <p className="text-gray-600">View enrolled students</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Meetings</h3>
              <p className="text-gray-600">Schedule & manage</p>
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Users</h3>
              <p className="text-gray-600">Manage all users</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Courses</h3>
              <p className="text-gray-600">Manage all courses</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">Platform insights</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

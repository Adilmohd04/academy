import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function CheckRole() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const userRole = user.publicMetadata?.role as string

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Account Info</h1>
        
        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-semibold text-gray-900">{user.emailAddresses[0]?.emailAddress}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Full Name</p>
            <p className="text-lg font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Clerk User ID</p>
            <p className="text-lg font-mono text-gray-900">{user.id}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-sm text-gray-600">Current Role</p>
            <p className="text-lg font-semibold text-gray-900">
              {userRole ? (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  userRole === 'admin' ? 'bg-yellow-100 text-yellow-800' :
                  userRole === 'teacher' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {userRole === 'admin' ? '👑 Admin' : 
                   userRole === 'teacher' ? '👨‍🏫 Teacher' : 
                   '🎓 Student'}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  ❌ No Role Set
                </span>
              )}
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">⚠️ Need Admin Access?</p>
            <p className="text-sm text-blue-700">
              To access the admin portal, you need the <strong>admin</strong> role. 
              Go to <a href="https://dashboard.clerk.com" target="_blank" className="underline font-semibold">Clerk Dashboard</a> → 
              Users → Select your user → Edit → Scroll to "Public metadata" → Add:
            </p>
            <pre className="mt-2 p-3 bg-blue-100 rounded text-xs font-mono">
{`{
  "role": "admin"
}`}
            </pre>
            <p className="text-xs text-blue-600 mt-2">After saving, refresh this page and your role will update.</p>
          </div>

          <div className="flex gap-4 mt-6">
            <a 
              href="/dashboard" 
              className="flex-1 text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Go to Dashboard
            </a>
            {userRole === 'admin' && (
              <a 
                href="/admin" 
                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Go to Admin Portal 👑
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

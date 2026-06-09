// Auth is now handled by Clerk — users sign in directly.
// This page is kept as a placeholder; the admin assigns building/role after sign-up.

export default function Join() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl text-center space-y-4">
        <div className="text-5xl">🏢</div>
        <h2 className="text-xl font-semibold text-gray-800">Tenax</h2>
        <p className="text-gray-500 text-sm">
          Sign in to your account. Contact your HOA admin if you need access.
        </p>
        <a href="/Tenax/"
          className="block w-full py-3 rounded-xl text-white font-medium text-sm"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          Sign In
        </a>
      </div>
    </div>
  )
}

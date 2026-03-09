'use client'

import Card from '@/components/ui/Card'

export default function AdminPaymentsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-islamic-green mb-6">Payment Management</h1>
      
      <Card>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Payment Overview</h2>
          <p className="text-gray-600 mb-6">
            View and manage all course payments and transactions
          </p>
          <p className="text-sm text-gray-500">
            This feature will display payment history, pending transactions, and revenue analytics
          </p>
        </div>
      </Card>
    </div>
  )
}

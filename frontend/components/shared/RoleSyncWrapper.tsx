'use client'

import { useRoleSync } from '@/hooks/useRoleSync'

export default function RoleSyncWrapper({ children }: { children: React.ReactNode }) {
  useRoleSync()
  return <>{children}</>
}

import { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { sql } from '../lib/db'

const AuthContext = createContext({})

// HOA role hierarchy
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PRESIDENT: 'president',
  VICE_PRESIDENT: 'vice_president',
  TREASURER: 'treasurer',
  TENANT: 'tenant',
}

const FINANCE_ROLES = [ROLES.TREASURER, ROLES.SUPER_ADMIN]
const HOA_ADMIN_ROLES = [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT, ROLES.SUPER_ADMIN]

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerkAuth()

  const [profile, setProfile] = useState(null)
  const [building, setBuilding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userLoaded) return

    if (!clerkUser) {
      setProfile(null)
      setBuilding(null)
      setLoading(false)
      return
    }

    fetchProfile(clerkUser.id)
  }, [clerkUser, userLoaded])

  async function fetchProfile(userId) {
    try {
      const rows = await sql`
        SELECT p.*, b.name AS building_name, b.address AS building_address
        FROM profiles p
        LEFT JOIN buildings b ON b.id = p.building_id
        WHERE p.id = ${userId}
        LIMIT 1
      `

      if (rows.length > 0) {
        const row = rows[0]
        setProfile(row)
        if (row.building_id) {
          setBuilding({
            id: row.building_id,
            name: row.building_name,
            address: row.building_address,
          })
        }
      } else {
        // No profile yet — user needs to join a building
        setProfile(null)
        setBuilding(null)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await clerkSignOut()
    setProfile(null)
    setBuilding(null)
  }

  const role = profile?.role ?? null
  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const isPresident = role === ROLES.PRESIDENT || isSuperAdmin
  const isVicePresident = role === ROLES.VICE_PRESIDENT || isSuperAdmin
  const isTreasurer = role === ROLES.TREASURER || isSuperAdmin
  const isHOAAdmin = HOA_ADMIN_ROLES.includes(role)
  const canManageFinances = FINANCE_ROLES.includes(role)
  const canApproveContent = HOA_ADMIN_ROLES.includes(role)

  return (
    <AuthContext.Provider value={{
      user: clerkUser,
      profile,
      building,
      loading: loading || !userLoaded,
      signOut,
      refreshProfile: () => clerkUser && fetchProfile(clerkUser.id),
      role,
      isSuperAdmin,
      isPresident,
      isVicePresident,
      isTreasurer,
      isHOAAdmin,
      canManageFinances,
      canApproveContent,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

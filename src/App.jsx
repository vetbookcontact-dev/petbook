import { useCallback, useEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import OwnerProfileModal from './components/OwnerProfileModal'
import Dashboard from './screens/Dashboard'
import Vaccines from './screens/Vaccines'
import AITriage from './screens/AITriage'
import FoodChecker from './screens/FoodChecker'
import Emergency from './screens/Emergency'
import DogParks from './screens/DogParks'
import Login from './screens/Login'
import { completeRedirectSignIn, signOutUser, subscribeToAuth } from './services/authService'
import {
  addPet,
  deletePet,
  getPets,
  getUserProfile,
  getVaccines,
  uniqueById,
  updatePet,
  updateUserProfile,
} from './services/petService'

function profileDraftFromAuth(user) {
  return {
    fullName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    phone: '',
    address: '',
    onboardingComplete: false,
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState(null)
  const [handshakeDone, setHandshakeDone] = useState(false)
  const [tab, setTab] = useState('home')
  const [pets, setPets] = useState([])
  const [activePetId, setActivePetId] = useState(null)
  const [vaccinesByPetId, setVaccinesByPetId] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savingPet, setSavingPet] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileReady, setProfileReady] = useState(false)

  const userId = user?.uid ?? null
  const activePet = pets.find((p) => p.id === activePetId) ?? null
  const vaccines = activePetId ? (vaccinesByPetId[activePetId] ?? []) : []
  const needsOnboarding = profileReady && !ownerProfile?.onboardingComplete

  const resetSession = useCallback(() => {
    setPets([])
    setActivePetId(null)
    setVaccinesByPetId({})
    setOwnerProfile(null)
    setProfileModalOpen(false)
    setProfileReady(false)
    setLoadError('')
    setTab('home')
  }, [])

  const refreshVaccinesMap = useCallback(async (petList, uid) => {
    if (!petList?.length || !uid) {
      setVaccinesByPetId({})
      return {}
    }
    const entries = await Promise.all(
      petList.map(async (pet) => [pet.id, await getVaccines(pet.id, uid)]),
    )
    const map = Object.fromEntries(entries)
    setVaccinesByPetId(map)
    return map
  }, [])

  const refreshVaccines = useCallback(
    async (petId) => {
      if (!petId || !userId) return
      const list = await getVaccines(petId, userId)
      setVaccinesByPetId((prev) => ({ ...prev, [petId]: list }))
    },
    [userId],
  )

  useEffect(() => {
    let alive = true
    let firstAuthEvent = false
    let redirectSettled = false

    function maybeReady() {
      if (alive && firstAuthEvent && redirectSettled) {
        setAuthReady(true)
        setHandshakeDone(true)
      }
    }

    completeRedirectSignIn()
      .then((result) => {
        if (!alive) return
        if (result?.user) setUser(result.user)
      })
      .finally(() => {
        redirectSettled = true
        maybeReady()
      })

    const unsub = subscribeToAuth((nextUser) => {
      if (!alive) return
      firstAuthEvent = true
      setUser(nextUser)
      if (nextUser) {
        setLoading(true)
        setProfileReady(false)
        setLoadError('')
      } else if (redirectSettled) {
        resetSession()
        setLoading(false)
      }
      maybeReady()
    })

    return () => {
      alive = false
      unsub()
    }
  }, [resetSession])

  useEffect(() => {
    if (!authReady || !handshakeDone || !userId) return

    let alive = true
    ;(async () => {
      const profile = await getUserProfile(userId).catch(() => null)
      if (!alive) return
      const nextProfile = profile || profileDraftFromAuth(user)
      setOwnerProfile(nextProfile)

      let uniquePets = []
      try {
        uniquePets = uniqueById(await getPets(userId))
      } catch (error) {
        if (!alive) return
        setLoadError(error?.message || 'טעינת הנתונים נכשלה')
      }
      if (!alive) return
      setPets(uniquePets)
      setActivePetId(uniquePets[0]?.id ?? null)

      if (uniquePets.length) {
        try {
          await refreshVaccinesMap(uniquePets, userId)
        } catch {
          /* stay signed in even if vaccines fail */
        }
      }

      if (!nextProfile?.onboardingComplete) {
        setProfileModalOpen(true)
      }
      setProfileReady(true)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [authReady, handshakeDone, user, userId, refreshVaccinesMap])

  async function handleAddPet(petData) {
    if (!userId) return null
    setSavingPet(true)
    try {
      const created = await addPet(userId, petData)
      setPets((prev) => uniqueById([...prev, created]))
      setActivePetId(created.id)
      setVaccinesByPetId((prev) => ({ ...prev, [created.id]: [] }))
      setTab('home')
      return created
    } finally {
      setSavingPet(false)
    }
  }

  async function handleUpdatePet(petId, updatedData) {
    if (!userId) return null
    setSavingPet(true)
    try {
      const updated = await updatePet(userId, petId, updatedData)
      setPets((prev) => uniqueById(prev.map((p) => (p.id === petId ? updated : p))))
      return updated
    } finally {
      setSavingPet(false)
    }
  }

  async function handleDeletePet(petId) {
    if (!userId || !petId) return false
    setSavingPet(true)
    try {
      await deletePet(userId, petId)
      const remaining = pets.filter((p) => p.id !== petId)
      setPets(remaining)
      setVaccinesByPetId((prev) => {
        const next = { ...prev }
        delete next[petId]
        return next
      })
      if (activePetId === petId) {
        setActivePetId(remaining[0]?.id ?? null)
        setTab('home')
      }
      return true
    } finally {
      setSavingPet(false)
    }
  }

  async function handleSaveProfile(profileData) {
    if (!userId) return null
    setSavingProfile(true)
    try {
      const saved = await updateUserProfile(profileData, userId)
      setOwnerProfile(saved)
      setProfileModalOpen(false)
      return saved
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSignOut() {
    await signOutUser()
    resetSession()
  }

  if (!authReady || !handshakeDone) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <AppShell>
      <div className="px-4 pt-5 md:px-8">
        {loading && <LoadingState />}

        {!loading && loadError && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft ring-1 ring-slate-100">
            <p className="font-bold text-slate-900">לא הצלחנו לטעון את הנתונים</p>
            <p className="mt-1 text-sm text-slate-500">{loadError}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white"
            >
              התנתקות
            </button>
          </div>
        )}

        {!loading && !loadError && tab === 'home' && (
          <Dashboard
            pets={pets}
            activePet={activePet}
            vaccinesByPetId={vaccinesByPetId}
            ownerProfile={ownerProfile}
            onSelectPet={setActivePetId}
            onNavigate={setTab}
            onAddPet={handleAddPet}
            onUpdatePet={handleUpdatePet}
            onDeletePet={handleDeletePet}
            onOpenProfile={() => setProfileModalOpen(true)}
            savingPet={savingPet}
          />
        )}

        {!loading && !loadError && tab === 'vaccines' && activePet && (
          <Vaccines
            pet={activePet}
            vaccines={vaccines}
            ownerProfile={ownerProfile}
            onBack={() => setTab('home')}
            onRefresh={() => refreshVaccines(activePet.id)}
            onUpdatePet={handleUpdatePet}
            onDeletePet={handleDeletePet}
            savingPet={savingPet}
          />
        )}

        {!loading && !loadError && tab === 'vaccines' && !activePet && (
          <EmptyPetHint onGoHome={() => setTab('home')} />
        )}

        {!loading && !loadError && tab === 'triage' && (
          activePet ? (
            <AITriage
              pet={activePet}
              ownerProfile={ownerProfile}
              onGoEmergency={() => setTab('emergency')}
            />
          ) : (
            <EmptyPetHint onGoHome={() => setTab('home')} />
          )
        )}

        {!loading && !loadError && tab === 'food' && <FoodChecker />}

        {!loading && !loadError && tab === 'emergency' && <Emergency />}

        {!loading && !loadError && tab === 'dog-parks' && (
          <DogParks
            onBack={() => setTab('home')}
            pets={pets}
            activePetId={activePetId}
            ownerProfile={ownerProfile}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <OwnerProfileModal
        open={profileModalOpen}
        profile={ownerProfile}
        required={needsOnboarding}
        saving={savingProfile}
        onClose={() => {
          if (!needsOnboarding) setProfileModalOpen(false)
        }}
        onSubmit={handleSaveProfile}
        onSignOut={handleSignOut}
      />
    </AppShell>
  )
}

function AppShell({ children }) {
  return (
    <div
      dir="rtl"
      className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-20 text-slate-900 md:max-w-6xl"
    >
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <img
          src="/app-icon.png"
          alt="וט-בוק"
          className="mx-auto mb-3 h-14 w-14 rounded-full bg-white object-contain shadow-soft ring-1 ring-brand-100"
        />
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        <p className="text-sm font-medium text-slate-500">טוען את וט-בוק...</p>
      </div>
    </div>
  )
}

function EmptyPetHint({ onGoHome }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-soft ring-1 ring-slate-100">
      <p className="font-bold text-slate-900">בחרו או הוסיפו חיה תחילה</p>
      <p className="mt-1 text-sm text-slate-500">המסך הזה דורש חיה פעילה</p>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-4 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white"
      >
        חזרה לראשי
      </button>
    </div>
  )
}

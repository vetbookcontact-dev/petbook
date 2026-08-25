import { useCallback, useEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import OwnerProfileModal from './components/OwnerProfileModal'
import Dashboard from './screens/Dashboard'
import Vaccines from './screens/Vaccines'
import AITriage from './screens/AITriage'
import FoodChecker from './screens/FoodChecker'
import Emergency from './screens/Emergency'
import DogParks from './screens/DogParks'
import {
  MOCK_USER_ID,
  addPet,
  getPets,
  getUserProfile,
  getVaccines,
  uniqueById,
  updatePet,
  updateUserProfile,
} from './services/petService'

export default function App() {
  const [tab, setTab] = useState('home')
  const [pets, setPets] = useState([])
  const [activePetId, setActivePetId] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [vaccinesByPetId, setVaccinesByPetId] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingPet, setSavingPet] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileReady, setProfileReady] = useState(false)

  const activePet = pets.find((p) => p.id === activePetId) ?? null
  const needsOnboarding = profileReady && !ownerProfile?.onboardingComplete

  const refreshVaccinesMap = useCallback(async (petList) => {
    if (!petList?.length) {
      setVaccinesByPetId({})
      setVaccines([])
      return {}
    }
    const entries = await Promise.all(
      petList.map(async (pet) => [pet.id, await getVaccines(pet.id)]),
    )
    const map = Object.fromEntries(entries)
    setVaccinesByPetId(map)
    return map
  }, [])

  const refreshVaccines = useCallback(
    async (petId) => {
      if (!petId) {
        setVaccines([])
        return
      }
      const list = await getVaccines(petId)
      setVaccines(list)
      setVaccinesByPetId((prev) => ({ ...prev, [petId]: list }))
    },
    [],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [list, profile] = await Promise.all([
          getPets(MOCK_USER_ID),
          getUserProfile(MOCK_USER_ID),
        ])
        if (!alive) return
        const uniquePets = uniqueById(list)
        setPets(uniquePets)
        setActivePetId(uniquePets[0]?.id ?? null)
        setOwnerProfile(profile)
        await refreshVaccinesMap(uniquePets)
        if (!profile?.onboardingComplete) {
          setProfileModalOpen(true)
        }
      } finally {
        if (alive) {
          setProfileReady(true)
          setLoading(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [refreshVaccinesMap])

  useEffect(() => {
    if (!activePetId) {
      setVaccines([])
      return
    }
    const cached = vaccinesByPetId[activePetId]
    if (cached) {
      setVaccines(cached)
      return
    }
    refreshVaccines(activePetId)
  }, [activePetId, vaccinesByPetId, refreshVaccines])

  async function handleAddPet(petData) {
    setSavingPet(true)
    try {
      const created = await addPet(MOCK_USER_ID, petData)
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
    setSavingPet(true)
    try {
      const updated = await updatePet(petId, updatedData)
      setPets((prev) => uniqueById(prev.map((p) => (p.id === petId ? updated : p))))
      return updated
    } finally {
      setSavingPet(false)
    }
  }

  async function handleSaveProfile(profileData) {
    setSavingProfile(true)
    try {
      const saved = await updateUserProfile(profileData, MOCK_USER_ID)
      setOwnerProfile(saved)
      setProfileModalOpen(false)
      return saved
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 pb-20"
    >
      <div className="px-4 pt-5">
        {loading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
              <p className="text-sm font-medium text-slate-500">טוען את וט-בוק...</p>
            </div>
          </div>
        )}

        {!loading && tab === 'home' && (
          <Dashboard
            pets={pets}
            activePet={activePet}
            vaccinesByPetId={vaccinesByPetId}
            ownerProfile={ownerProfile}
            onSelectPet={setActivePetId}
            onNavigate={setTab}
            onAddPet={handleAddPet}
            onUpdatePet={handleUpdatePet}
            onOpenProfile={() => setProfileModalOpen(true)}
            savingPet={savingPet}
          />
        )}

        {!loading && tab === 'vaccines' && activePet && (
          <Vaccines
            pet={activePet}
            vaccines={vaccines}
            ownerProfile={ownerProfile}
            onBack={() => setTab('home')}
            onRefresh={() => refreshVaccines(activePet.id)}
            onUpdatePet={handleUpdatePet}
            savingPet={savingPet}
          />
        )}

        {!loading && tab === 'vaccines' && !activePet && (
          <EmptyPetHint onGoHome={() => setTab('home')} />
        )}

        {!loading && tab === 'triage' && (
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

        {!loading && tab === 'food' && <FoodChecker />}

        {!loading && tab === 'emergency' && <Emergency />}

        {!loading && tab === 'dog-parks' && (
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
      />
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

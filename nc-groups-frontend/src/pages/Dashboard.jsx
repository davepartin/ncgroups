import { useState, useEffect, useMemo } from 'react'
import { getPeople, getGroups, createPerson, createGroup, logout } from '../api/client'
import FilterBar from '../components/FilterBar'
import PersonList from '../components/PersonList'
import ActionBar from '../components/ActionBar'
import TextBlastModal from '../components/TextBlastModal'
import AddPersonModal from '../components/AddPersonModal'
import AddGroupModal from '../components/AddGroupModal'

export default function Dashboard() {
  const [people, setPeople] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filter state
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null) // Adult, Youth, Child
  const [selectedGender, setSelectedGender] = useState(null) // Guy, Lady

  // Modal state
  const [showTextBlast, setShowTextBlast] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [peopleRes, groupsRes] = await Promise.all([
        getPeople(),
        getGroups()
      ])
      setPeople(peopleRes.people)
      setGroups(groupsRes.groups)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPerson = async (personData) => {
    try {
      await createPerson(personData)
      loadData()
    } catch (err) {
      alert('Failed to add person')
    }
  }

  const handleAddGroup = async (groupData) => {
    try {
      await createGroup(groupData)
      loadData()
    } catch (err) {
      alert('Failed to add group')
    }
  }

  // Filter people based on selections
  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const fullName = `${person.firstName} ${person.lastName}`.toLowerCase()
        if (!fullName.includes(searchLower)) return false
      }

      // Group filter
      if (selectedGroup) {
        const inGroup = person.groups?.some(g => g.id === selectedGroup)
        if (!inGroup) return false
      }

      // Age group filter
      if (selectedAgeGroup && person.ageGroup !== selectedAgeGroup) {
        return false
      }

      // Gender filter
      if (selectedGender && person.gender !== selectedGender) {
        return false
      }

      return true
    })
  }, [people, search, selectedGroup, selectedAgeGroup, selectedGender])

  // People with phone numbers (for texting)
  const textablePeople = useMemo(() => {
    return filteredPeople.filter(p => p.phone && !p.isOptedOut)
  }, [filteredPeople])

  // Build filter description
  const filterDescription = useMemo(() => {
    const parts = []

    if (selectedAgeGroup && selectedGender) {
      // Combined: "Adult Guys", "Youth Ladies"
      parts.push(`${selectedAgeGroup} ${selectedGender === 'Guy' ? 'Guys' : 'Ladies'}`)
    } else if (selectedAgeGroup) {
      parts.push(`All ${selectedAgeGroup}s`)
    } else if (selectedGender) {
      parts.push(`All ${selectedGender === 'Guy' ? 'Guys' : 'Ladies'}`)
    } else {
      parts.push('Everyone')
    }

    if (selectedGroup) {
      const group = groups.find(g => g.id === selectedGroup)
      if (group) {
        parts.push(`in ${group.name}`)
      }
    }

    return parts.join(' ')
  }, [selectedAgeGroup, selectedGender, selectedGroup, groups])

  // Clear all filters
  const clearFilters = () => {
    setSelectedGroup(null)
    setSelectedAgeGroup(null)
    setSelectedGender(null)
    setSearch('')
  }

  const hasActiveFilters = selectedGroup || selectedAgeGroup || selectedGender || search

  return (
    <div className="min-h-screen bg-nc-light flex flex-col">
      {/* Header */}
      <header className="bg-nc-green text-white px-4 py-3 shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="font-display font-bold text-lg">nc</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">NC Groups</h1>
              <p className="text-white/70 text-xs">Neighborhood Church</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddGroup(true)}
              className="text-white/90 hover:text-white text-sm font-medium px-2 py-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              + Group
            </button>
            <button
              onClick={() => setShowAddPerson(true)}
              className="text-white/90 hover:text-white text-sm font-medium px-2 py-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              + Person
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={logout}
              className="text-white/70 hover:text-white text-sm font-medium px-2 py-1"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-[68px] z-30">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-gray-200 focus:border-nc-green focus:outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        groups={groups}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        selectedAgeGroup={selectedAgeGroup}
        setSelectedAgeGroup={setSelectedAgeGroup}
        selectedGender={selectedGender}
        setSelectedGender={setSelectedGender}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Results Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-nc-ink">
              {filterDescription}
            </h2>
            <p className="text-sm text-gray-500">
              {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'}
              {textablePeople.length !== filteredPeople.length && (
                <span className="text-nc-green"> · {textablePeople.length} with phone</span>
              )}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-nc-rose text-sm font-medium hover:underline"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* People List */}
      <main className="flex-1 overflow-auto pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-nc-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <PersonList people={filteredPeople} onRefresh={loadData} />
        )}
      </main>

      {/* Action Bar */}
      <ActionBar
        count={textablePeople.length}
        filters={{
          groupId: selectedGroup,
          gender: selectedGender,
          ageGroup: selectedAgeGroup
        }}
        onTextBlast={() => setShowTextBlast(true)}
      />

      {/* Text Blast Modal */}
      {showTextBlast && (
        <TextBlastModal
          filters={{
            groupId: selectedGroup,
            gender: selectedGender,
            ageGroup: selectedAgeGroup
          }}
          filterDescription={filterDescription}
          recipientCount={textablePeople.length}
          onClose={() => setShowTextBlast(false)}
        />
      )}

      {/* Add Person Modal */}
      {showAddPerson && (
        <AddPersonModal
          groups={groups}
          onClose={() => setShowAddPerson(false)}
          onAdd={handleAddPerson}
        />
      )}

      {/* Add Group Modal */}
      {showAddGroup && (
        <AddGroupModal
          onClose={() => setShowAddGroup(false)}
          onAdd={handleAddGroup}
        />
      )}
    </div>
  )
}

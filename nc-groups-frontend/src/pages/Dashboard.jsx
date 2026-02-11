import { useState, useEffect, useMemo } from 'react'
import { getPeople, getGroups, createPerson, createGroup, deleteGroup, logout, getFilteredPhones } from '../api/client'
import FilterBar from '../components/FilterBar'
import PersonList from '../components/PersonList'
import TextBlastModal from '../components/TextBlastModal'
import AddPersonModal from '../components/AddPersonModal'
import AddGroupModal from '../components/AddGroupModal'
import ManageGroupsModal from '../components/ManageGroupsModal'
import EditPersonModal from '../components/EditPersonModal'

export default function Dashboard() {
  const [people, setPeople] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filter state
  const [selectedGroups, setSelectedGroups] = useState([]) // Array of group IDs
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null) // Adult, Youth, Child
  const [selectedGender, setSelectedGender] = useState(null) // Male, Female
  const [selectedMembershipStatus, setSelectedMembershipStatus] = useState(null) // Member, RegularAttender, Youth, Other

  // Sort: 'firstName' | 'lastName'
  const [sortBy, setSortBy] = useState('lastName')

  // Action state
  const [copyLoading, setCopyLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Modal state
  const [showTextBlast, setShowTextBlast] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showManageGroups, setShowManageGroups] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)

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

  const handleDeleteGroup = async (groupId) => {
    try {
      await deleteGroup(groupId)
      // Check if deleted group was selected, if so, deselect it
      if (selectedGroups.includes(groupId)) {
        setSelectedGroups(selectedGroups.filter(id => id !== groupId))
      }
      loadData()
    } catch (err) {
      alert('Failed to delete group')
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

      // Group filter (OR logic)
      if (selectedGroups.length > 0) {
        // Person must be in AT LEAST ONE of the selected groups
        const inAnyGroup = person.groups?.some(g => selectedGroups.includes(g.id))
        if (!inAnyGroup) return false
      }

      // Age group filter
      if (selectedAgeGroup && person.ageGroup !== selectedAgeGroup) {
        return false
      }

      // Gender filter
      if (selectedGender && person.gender !== selectedGender) {
        return false
      }

      // Membership status filter
      if (selectedMembershipStatus && person.membershipStatus !== selectedMembershipStatus) {
        return false
      }

      return true
    })
  }, [people, search, selectedGroups, selectedAgeGroup, selectedGender, selectedMembershipStatus])

  // Sorted list for display
  const sortedPeople = useMemo(() => {
    const key = sortBy === 'firstName' ? 'firstName' : 'lastName'
    return [...filteredPeople].sort((a, b) => {
      const A = (a[key] || '').toLowerCase()
      const B = (b[key] || '').toLowerCase()
      return A.localeCompare(B)
    })
  }, [filteredPeople, sortBy])

  // People with phone numbers (for texting)
  const textablePeople = useMemo(() => {
    return filteredPeople.filter(p => p.phone && !p.isOptedOut)
  }, [filteredPeople])

  // Build filter description
  const filterDescription = useMemo(() => {
    const parts = []

    if (selectedAgeGroup && selectedGender) {
      // Combined: "Adult Males", "Youth Females"
      parts.push(`${selectedAgeGroup} ${selectedGender === 'Male' ? 'Males' : 'Females'}`)
    } else if (selectedAgeGroup) {
      parts.push(`All ${selectedAgeGroup}s`)
    } else if (selectedGender) {
      parts.push(`All ${selectedGender === 'Male' ? 'Males' : 'Females'}`)
    } else {
      parts.push('Everyone')
    }

    if (selectedGroups.length > 0) {
      if (selectedGroups.length === 1) {
        const group = groups.find(g => g.id === selectedGroups[0])
        if (group) parts.push(`in ${group.name}`)
      } else {
        parts.push(`in ${selectedGroups.length} groups`)
      }
    }

    return parts.join(' ')
  }, [selectedAgeGroup, selectedGender, selectedGroups, groups])

  // Clear all filters
  const clearFilters = () => {
    setSelectedGroups([])
    setSelectedAgeGroup(null)
    setSelectedGender(null)
    setSelectedMembershipStatus(null)
    setSearch('')
  }

  // Handle Copy Numbers
  const handleCopyNumbers = async () => {
    if (textablePeople.length === 0) return

    setCopyLoading(true)
    try {
      // Use the already filtered list of people
      const phones = textablePeople.map(p => p.phone)

      // Copy to clipboard (newlines for better iMessage support)
      await navigator.clipboard.writeText(phones.join('\n'))

      // Show feedback
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Failed to copy numbers: ' + err.message)
    } finally {
      setCopyLoading(false)
    }
  }

  const hasActiveFilters = selectedGroups.length > 0 || selectedAgeGroup || selectedGender || selectedMembershipStatus || search
  const actionDisabled = textablePeople.length === 0

  return (
    <div className="min-h-screen bg-nc-light flex flex-col">
      {/* Header */}
      <header className="bg-nc-green text-white px-4 py-2 shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="font-display font-bold text-base">nc</span>
            </div>
            <h1 className="font-display font-bold text-base">NC Groups</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddGroup(true)}
              className="text-white/90 hover:text-white text-sm font-medium px-2 py-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              + Group
            </button>
            <button
              onClick={() => setShowManageGroups(true)}
              className="text-white/70 hover:text-white text-xs px-2 py-1 hover:bg-white/10 rounded-lg transition-colors"
              title="Manage Groups"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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

      {/* Search & Actions Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-[52px] z-30">
        <div className="max-w-4xl mx-auto flex gap-3">
          {/* Search Input (40%) */}
          <div className="relative w-[40%]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-2 py-2.5 rounded-xl border-2 border-gray-200 focus:border-nc-green focus:outline-none transition-colors text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Action Buttons (Remaining space) */}
          <div className="flex-1 flex gap-2">
            {/* Copy Numbers Button */}
            <button
              onClick={handleCopyNumbers}
              disabled={actionDisabled || copyLoading}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${copied
                ? 'bg-green-600 text-white'
                : 'bg-nc-rose text-white hover:opacity-90'
                } ${actionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span className="truncate">Copy #s ({textablePeople.length})</span>
                </>
              )}
            </button>

            {/* Text Blast Button */}
            <button
              onClick={() => setShowTextBlast(true)}
              disabled={actionDisabled}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${actionDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-nc-blue hover:opacity-90'
                }`}
            >
              <span className="truncate">Mass Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        groups={groups}
        selectedGroups={selectedGroups}
        setSelectedGroups={setSelectedGroups}
        selectedAgeGroup={selectedAgeGroup}
        setSelectedAgeGroup={setSelectedAgeGroup}
        selectedGender={selectedGender}
        setSelectedGender={setSelectedGender}
        selectedMembershipStatus={selectedMembershipStatus}
        setSelectedMembershipStatus={setSelectedMembershipStatus}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Results Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort:</span>
            <button
              onClick={() => setSortBy('firstName')}
              className={`filter-pill shrink-0 ${sortBy === 'firstName' ? 'filter-pill-active' : 'filter-pill-inactive'}`}
            >
              First Name
            </button>
            <button
              onClick={() => setSortBy('lastName')}
              className={`filter-pill shrink-0 ${sortBy === 'lastName' ? 'filter-pill-active' : 'filter-pill-inactive'}`}
            >
              Last Name
            </button>
          </div>
        </div>
      </div>

      {/* People List */}
      <main className="flex-1 overflow-auto pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-nc-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4">
            <PersonList people={sortedPeople} onPersonClick={setEditingPerson} />
          </div>
        )}
      </main>



      {/* Text Blast Modal */}
      {showTextBlast && (
        <TextBlastModal
          recipients={textablePeople} // Pass explicit list of recipients
          filters={{
            groupIds: selectedGroups,
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

      {/* Manage Groups Modal */}
      {showManageGroups && (
        <ManageGroupsModal
          groups={groups}
          onClose={() => setShowManageGroups(false)}
          onDelete={handleDeleteGroup}
        />
      )}

      {editingPerson && (
        <EditPersonModal
          person={editingPerson}
          groups={groups}
          onClose={() => setEditingPerson(null)}
          onSave={async (updatedPerson) => {
            // Update the person in the local state
            setPeople(prevPeople =>
              prevPeople.map(p => p.id === updatedPerson.id ? updatedPerson : p)
            )
            setEditingPerson(null)
            // Reload groups to update member counts
            try {
              const groupsRes = await getGroups()
              setGroups(groupsRes.groups)
            } catch (err) {
              console.error('Failed to reload groups:', err)
            }
          }}
        />
      )}
    </div>
  )
}

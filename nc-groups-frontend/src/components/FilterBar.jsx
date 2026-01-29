import { useState } from 'react'

export default function FilterBar({
  groups,
  selectedGroup,
  setSelectedGroup,
  selectedAgeGroup,
  setSelectedAgeGroup,
  selectedGender,
  setSelectedGender,
  clearFilters,
  hasActiveFilters
}) {
  const [showGroups, setShowGroups] = useState(false)

  // Age group options
  const ageGroups = [
    { value: null, label: 'Everyone' },
    { value: 'Adult', label: 'Adults' },
    { value: 'Youth', label: 'Youth' },
    { value: 'Child', label: 'Children' },
  ]

  // Gender options (only show when age group is selected, except for Children)
  const genderOptions = [
    { value: null, label: 'All' },
    { value: 'Guy', label: 'Guys' },
    { value: 'Lady', label: 'Ladies' },
  ]

  // Show gender filter for Adults and Youth
  const showGenderFilter = selectedAgeGroup === 'Adult' || selectedAgeGroup === 'Youth'

  // Categorize groups
  const dGroups = groups.filter(g => g.name.includes('D-Group') || g.name.includes('Group'))
  const ministryGroups = groups.filter(g => 
    !g.name.includes('D-Group') && 
    !g.name.includes('Group') &&
    !['ALL NCYG', 'Kids Min Parents', 'Youth Parents'].includes(g.name)
  )
  const specialGroups = groups.filter(g => 
    ['ALL NCYG', 'Kids Min Parents', 'Youth Parents'].includes(g.name)
  )

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[132px] z-20">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
        
        {/* Row 1: Age Group Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Who:</span>
          {ageGroups.map(ag => (
            <button
              key={ag.value || 'all'}
              onClick={() => {
                setSelectedAgeGroup(ag.value)
                if (!ag.value || ag.value === 'Child') {
                  setSelectedGender(null)
                }
              }}
              className={`filter-pill shrink-0 ${
                selectedAgeGroup === ag.value ? 'filter-pill-active' : 'filter-pill-inactive'
              }`}
            >
              {ag.label}
            </button>
          ))}
        </div>

        {/* Row 2: Gender Filter (conditional) */}
        {showGenderFilter && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Gender:</span>
            {genderOptions.map(g => (
              <button
                key={g.value || 'all'}
                onClick={() => setSelectedGender(g.value)}
                className={`filter-pill shrink-0 ${
                  selectedGender === g.value ? 'filter-pill-active' : 'filter-pill-inactive'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Ministry Group Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Group:</span>
          
          <button
            onClick={() => setSelectedGroup(null)}
            className={`filter-pill shrink-0 ${
              !selectedGroup ? 'filter-pill-active' : 'filter-pill-inactive'
            }`}
          >
            All Groups
          </button>

          <button
            onClick={() => setShowGroups(!showGroups)}
            className={`filter-pill shrink-0 flex items-center gap-1 ${
              selectedGroup ? 'filter-pill-active' : 'filter-pill-inactive'
            }`}
          >
            {selectedGroup 
              ? groups.find(g => g.id === selectedGroup)?.name || 'Select Group'
              : 'Select Group'
            }
            <svg 
              className={`w-4 h-4 transition-transform ${showGroups ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Group Dropdown */}
        {showGroups && (
          <div className="bg-nc-light rounded-xl p-4 space-y-4 border border-gray-200">
            {/* Special Groups */}
            {specialGroups.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special Groups</h4>
                <div className="flex flex-wrap gap-2">
                  {specialGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group.id)
                        setShowGroups(false)
                      }}
                      className={`filter-pill text-xs ${
                        selectedGroup === group.id ? 'filter-pill-active' : 'filter-pill-inactive'
                      }`}
                    >
                      {group.name} <span className="opacity-70">({group.memberCount})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ministry Teams */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ministry Teams</h4>
              <div className="flex flex-wrap gap-2">
                {ministryGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group.id)
                      setShowGroups(false)
                    }}
                    className={`filter-pill text-xs ${
                      selectedGroup === group.id ? 'filter-pill-active' : 'filter-pill-inactive'
                    }`}
                  >
                    {group.name} <span className="opacity-70">({group.memberCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* D-Groups */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">D-Groups & Small Groups</h4>
              <div className="flex flex-wrap gap-2">
                {dGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group.id)
                      setShowGroups(false)
                    }}
                    className={`filter-pill text-xs ${
                      selectedGroup === group.id ? 'filter-pill-active' : 'filter-pill-inactive'
                    }`}
                  >
                    {group.name} <span className="opacity-70">({group.memberCount})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

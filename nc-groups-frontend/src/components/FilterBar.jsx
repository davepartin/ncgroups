import { useState } from 'react'

function GroupPill({ group, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(group.id)}
      aria-pressed={selected}
      className={`filter-pill text-xs inline-flex items-center gap-1.5 ${selected ? 'filter-pill-active' : 'filter-pill-inactive'}`}
    >
      {selected && (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span>{group.name}</span>
      {Number.isFinite(group.memberCount) && (
        <span className="opacity-70">({group.memberCount})</span>
      )}
    </button>
  )
}

export default function FilterBar({
  groups,
  selectedGroups,
  setSelectedGroups,
  selectedAgeGroup,
  setSelectedAgeGroup,
  selectedGender,
  setSelectedGender,
  selectedMembershipStatus,
  setSelectedMembershipStatus
}) {
  const [showGroups, setShowGroups] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')

  const ageGroups = [
    { value: null, label: 'All' },
    { value: 'Adult', label: 'Adults' },
    { value: 'Youth', label: 'Youth' },
    { value: 'Child', label: 'Children' },
  ]

  const genderOptions = [
    { value: null, label: 'All' },
    { value: 'Male', label: 'Males' },
    { value: 'Female', label: 'Females' },
  ]

  const toggleMembershipStatus = (status) => {
    setSelectedMembershipStatus(current => (
      current.includes(status)
        ? current.filter(value => value !== status)
        : [...current, status]
    ))
  }

  const toggleGroup = (groupId) => {
    setSelectedGroups(current => (
      current.includes(groupId)
        ? current.filter(id => id !== groupId)
        : [...current, groupId]
    ))
  }

  const searchValue = groupSearch.trim().toLowerCase()
  const visibleGroups = [...groups]
    .filter(group => !searchValue || group.name.toLowerCase().includes(searchValue))
    .sort((left, right) => left.name.localeCompare(right.name))

  const isSmallGroup = (name) => /d-group|neighborhood group/i.test(name)
  const isLifeStageGroup = (name) => /youth|student|kids|children|young adult|joy club|men('|’)s|women('|’)s/i.test(name)

  const groupSections = [
    {
      title: 'Age & Life Stage',
      groups: visibleGroups.filter(group => isLifeStageGroup(group.name) && !isSmallGroup(group.name))
    },
    {
      title: 'D-Groups & Small Groups',
      groups: visibleGroups.filter(group => isSmallGroup(group.name))
    },
    {
      title: 'Ministry Teams',
      groups: visibleGroups.filter(group => !isLifeStageGroup(group.name) && !isSmallGroup(group.name))
    }
  ].filter(section => section.groups.length > 0)

  const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 w-14 sm:w-16'

  return (
    <div className="bg-white border-b border-gray-200 sm:sticky sm:top-[116px] z-20">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <span className={labelClass}>Who</span>
          {ageGroups.map(ageGroup => (
            <button
              type="button"
              key={ageGroup.value || 'all'}
              onClick={() => setSelectedAgeGroup(ageGroup.value)}
              aria-pressed={selectedAgeGroup === ageGroup.value}
              className={`filter-pill shrink-0 ${selectedAgeGroup === ageGroup.value ? 'filter-pill-active' : 'filter-pill-inactive'}`}
            >
              {ageGroup.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <span className={labelClass}>Gender</span>
          {genderOptions.map(gender => (
            <button
              type="button"
              key={gender.value || 'all'}
              onClick={() => setSelectedGender(gender.value)}
              aria-pressed={selectedGender === gender.value}
              className={`filter-pill shrink-0 ${selectedGender === gender.value ? 'filter-pill-active' : 'filter-pill-inactive'}`}
            >
              {gender.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <span className={labelClass}>Status</span>
          <button
            type="button"
            onClick={() => setSelectedMembershipStatus([])}
            aria-pressed={selectedMembershipStatus.length === 0}
            className={`filter-pill shrink-0 ${selectedMembershipStatus.length === 0 ? 'filter-pill-active' : 'filter-pill-inactive'}`}
          >
            All
          </button>
          {[
            ['Member', 'Members'],
            ['RegularAttender', 'Regulars'],
            ['Youth', 'Youth'],
            ['Other', 'Other']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => toggleMembershipStatus(value)}
              aria-pressed={selectedMembershipStatus.includes(value)}
              className={`filter-pill shrink-0 ${selectedMembershipStatus.includes(value) ? 'filter-pill-active' : 'filter-pill-inactive'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelClass}>Group</span>
          <button
            type="button"
            onClick={() => {
              setSelectedGroups([])
              setShowGroups(false)
            }}
            className={`filter-pill shrink-0 ${selectedGroups.length === 0 ? 'filter-pill-active' : 'filter-pill-inactive'}`}
          >
            All Groups
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGroups(current => !current)
              setGroupSearch('')
            }}
            aria-expanded={showGroups}
            aria-controls="group-picker"
            className={`filter-pill shrink-0 inline-flex items-center gap-1.5 ${selectedGroups.length > 0 ? 'filter-pill-active' : 'filter-pill-inactive'}`}
          >
            {selectedGroups.length > 0
              ? `${selectedGroups.length} selected`
              : 'Choose Groups'
            }
            <svg
              className={`w-4 h-4 transition-transform ${showGroups ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showGroups && (
          <div
            id="group-picker"
            className="bg-nc-light rounded-2xl border border-gray-200 shadow-lg max-h-[min(68vh,34rem)] overflow-y-auto overscroll-contain p-3 sm:p-4"
          >
            <div className="sticky top-0 z-20 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 px-3 sm:px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-nc-ink">Choose groups</h3>
                    {selectedGroups.length > 0 && (
                      <span className="inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-nc-green/10 text-nc-green text-xs font-bold px-1.5">
                        {selectedGroups.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-gray-500 truncate">People in any selected group are included.</p>
                    {selectedGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedGroups([])}
                        className="text-[11px] font-semibold text-nc-rose hover:underline shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroups(false)}
                  className="min-h-11 bg-nc-green text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-nc-green-dark active:scale-95 transition-all shrink-0"
                >
                  Done
                </button>
              </div>
            </div>

            <div className="pt-3 space-y-5">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={groupSearch}
                  onChange={event => setGroupSearch(event.target.value)}
                  placeholder="Find a group..."
                  aria-label="Find a group"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/10"
                />
              </div>

              {groupSections.map(section => (
                <section key={section.title}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {section.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {section.groups.map(group => (
                      <GroupPill
                        key={group.id}
                        group={group}
                        selected={selectedGroups.includes(group.id)}
                        onToggle={toggleGroup}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {groupSections.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500">
                  No groups match “{groupSearch}”.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

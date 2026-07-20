import { useEffect, useState } from 'react'

function GroupRow({ group, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(group.id)}
      className="w-full min-h-14 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:border-nc-green hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-nc-ink truncate">{group.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
        </div>
      </div>
      <span className="w-9 h-9 rounded-full bg-nc-green/10 text-nc-green flex items-center justify-center shrink-0" aria-hidden="true">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m-7-7h14" />
        </svg>
      </span>
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

  useEffect(() => {
    if (!showGroups) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowGroups(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [showGroups])

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

  const openGroupPicker = () => {
    setGroupSearch('')
    setShowGroups(true)
  }

  const selectGroup = (groupId) => {
    setSelectedGroups(current => (
      current.includes(groupId) ? current : [...current, groupId]
    ))
    setGroupSearch('')
    setShowGroups(false)
  }

  const removeGroup = (groupId) => {
    setSelectedGroups(current => current.filter(id => id !== groupId))
  }

  const clearGroups = () => {
    setSelectedGroups([])
    setGroupSearch('')
  }

  const selectedGroupRecords = selectedGroups
    .map(id => groups.find(group => group.id === id))
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name))

  const searchValue = groupSearch.trim().toLowerCase()
  const availableGroups = [...groups]
    .filter(group => !selectedGroups.includes(group.id))
    .filter(group => !searchValue || group.name.toLowerCase().includes(searchValue))
    .sort((left, right) => left.name.localeCompare(right.name))

  const isSmallGroup = (name) => /d-group|neighborhood group/i.test(name)
  const isLifeStageGroup = (name) => /youth|student|kids|children|young adult|joy club|men('|’)s|women('|’)s/i.test(name)

  const groupSections = [
    {
      title: 'Age & Life Stage',
      groups: availableGroups.filter(group => isLifeStageGroup(group.name) && !isSmallGroup(group.name))
    },
    {
      title: 'D-Groups & Small Groups',
      groups: availableGroups.filter(group => isSmallGroup(group.name))
    },
    {
      title: 'Ministry Teams',
      groups: availableGroups.filter(group => !isLifeStageGroup(group.name) && !isSmallGroup(group.name))
    }
  ].filter(section => section.groups.length > 0)

  const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 w-14 sm:w-16'

  return (
    <>
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
              onClick={openGroupPicker}
              className="filter-pill filter-pill-active shrink-0 inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
              </svg>
              {selectedGroups.length > 0 ? 'Add Another Group' : 'Choose a Group'}
            </button>
            {selectedGroups.length > 0 && (
              <button
                type="button"
                onClick={clearGroups}
                className="filter-pill shrink-0 bg-white border-nc-rose/30 text-nc-rose hover:bg-nc-rose/5"
              >
                Clear Groups
              </button>
            )}
          </div>

          {selectedGroupRecords.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              <span className={labelClass}>Selected</span>
              {selectedGroupRecords.map(group => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => removeGroup(group.id)}
                  aria-label={`Remove ${group.name}`}
                  className="filter-pill filter-pill-inactive shrink-0 inline-flex items-center gap-1.5"
                >
                  {group.name}
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showGroups && (
        <div className="fixed inset-0 z-[70] bg-white sm:bg-black/40 sm:p-4 sm:flex sm:items-center sm:justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-picker-title"
            className="w-full h-full bg-nc-light flex flex-col sm:max-w-lg sm:h-[min(46rem,92vh)] sm:rounded-3xl sm:shadow-2xl sm:overflow-hidden"
          >
            <div className="shrink-0 bg-white border-b border-gray-200 px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="group-picker-title" className="font-display text-xl font-bold text-nc-ink">Choose a group</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Tap one group. This screen will close automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroups(false)}
                  aria-label="Close group picker"
                  className="w-11 h-11 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative mt-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={groupSearch}
                  onChange={event => setGroupSearch(event.target.value)}
                  placeholder="Search groups..."
                  aria-label="Search groups"
                  autoComplete="off"
                  className="w-full bg-nc-light border-2 border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-base focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6">
              {groupSections.map(section => (
                <section key={section.title}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
                    {section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.groups.map(group => (
                      <GroupRow key={group.id} group={group} onSelect={selectGroup} />
                    ))}
                  </div>
                </section>
              ))}

              {groupSections.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-nc-ink">
                    {searchValue ? `No groups match “${groupSearch}”.` : 'All groups are selected.'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchValue ? 'Try a different search.' : 'Clear groups to start over.'}
                  </p>
                </div>
              )}
            </div>

            <div
              className="shrink-0 bg-white border-t border-gray-200 px-4 pt-3 flex items-center justify-between gap-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <div>
                <div className="text-sm font-bold text-nc-ink">
                  {selectedGroups.length} {selectedGroups.length === 1 ? 'group' : 'groups'} selected
                </div>
                <div className="text-xs text-gray-500">Groups combine automatically.</div>
              </div>
              {selectedGroups.length > 0 && (
                <button
                  type="button"
                  onClick={clearGroups}
                  className="min-h-11 rounded-xl border border-nc-rose/30 px-4 py-2 text-sm font-semibold text-nc-rose hover:bg-nc-rose/5 active:scale-95 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

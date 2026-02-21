export default function PersonList({ people, onPersonClick }) {
  // Helper to get a consistent color from a name
  const getAvatarColor = (first = '', last = '') => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
      'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
      'bg-fuchsia-500', 'bg-orange-500'
    ];
    const charCodeSum = (first.charCodeAt(0) || 0) + (last.charCodeAt(0) || 0);
    return colors[charCodeSum % colors.length];
  };
  if (people.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No people found matching your filters.
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-2">
      {people.map(person => (
        <div
          key={person.id}
          onClick={() => onPersonClick(person)}
          className="p-3.5 bg-white flex items-center justify-between cursor-pointer rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm ${getAvatarColor(person.firstName, person.lastName)}`}>
              {(person.firstName?.[0] || '').toUpperCase()}{(person.lastName?.[0] || '').toUpperCase()}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${person.isOptedOut ? 'text-nc-rose' : 'text-nc-green'}`}>
                {person.firstName} {person.lastName}
                {person.isOptedOut && <span className="ml-1.5 text-[10px] font-normal">(opted out)</span>}
                {person.membershipStatus && (
                  <span className={`ml-1.5 text-[10px] font-normal px-1.5 py-0.5 rounded-full ${person.membershipStatus === 'Member' ? 'bg-nc-green/10 text-nc-green' :
                    person.membershipStatus === 'RegularAttender' ? 'bg-nc-blue/10 text-nc-blue' :
                      person.membershipStatus === 'Youth' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {person.membershipStatus.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                )}
              </h3>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-1.5">
                {person.ageGroup && <span>{person.ageGroup}</span>}
                {person.ageGroup && person.gender && <span>•</span>}
                {person.gender && <span>{person.gender}</span>}
                {(person.ageGroup || person.gender) && person.phone && <span>•</span>}
                {person.phone && <span>{person.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
            {person.groups?.slice(0, 3).map(g => (
              <span key={g.id} className="px-1.5 py-0.5 bg-gray-100 text-[10px] rounded-full whitespace-nowrap">
                {g.name}
              </span>
            ))}
            {person.groups?.length > 3 && (
              <span className="px-1.5 py-0.5 bg-gray-200 text-[10px] rounded-full">
                +{person.groups.length - 3}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

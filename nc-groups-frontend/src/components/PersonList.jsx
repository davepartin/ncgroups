export default function PersonList({ people, onPersonClick }) {
  if (people.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No people found matching your filters.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {people.map(person => (
        <div
          key={person.id}
          onClick={() => onPersonClick(person)}
          className="p-3 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer active:bg-gray-100 transition-colors"
        >
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
          <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
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

export default function PersonList({ people, onRefresh }) {
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
                <div key={person.id} className="p-4 bg-white hover:bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">{person.firstName} {person.lastName}</h3>
                        <div className="text-sm text-gray-500 flex gap-2">
                            <span>{person.ageGroup}</span>
                            <span>•</span>
                            <span>{person.gender}</span>
                            {person.phone && (
                                <>
                                    <span>•</span>
                                    <span>{person.phone}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {person.groups?.map(g => (
                            <span key={g.id} className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                                {g.name}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

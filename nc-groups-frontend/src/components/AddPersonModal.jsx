import { useState } from 'react'

export default function AddPersonModal({ groups, onClose, onAdd }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        ageGroup: 'Adult',
        membershipStatus: 'RegularAttender',
        gender: 'Male',
        phone: '',
        selectedGroups: []
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        // Convert selected group IDs to group objects (mock logic)
        const personGroups = groups.filter(g => formData.selectedGroups.includes(g.id))

        onAdd({
            firstName: formData.firstName,
            lastName: formData.lastName,
            ageGroup: formData.ageGroup,
            membershipStatus: formData.membershipStatus,
            gender: formData.gender,
            phone: formData.phone,
            groups: personGroups
        })
        onClose()
    }

    const toggleGroup = (groupId) => {
        setFormData(prev => {
            if (prev.selectedGroups.includes(groupId)) {
                return { ...prev, selectedGroups: prev.selectedGroups.filter(id => id !== groupId) }
            }
            return { ...prev, selectedGroups: [...prev.selectedGroups, groupId] }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Add Person</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                required
                                type="text"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                required
                                type="text"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Membership Status</label>
                            <select
                                value={formData.membershipStatus}
                                onChange={e => setFormData({ ...formData, membershipStatus: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            >
                                <option value="Member">Member</option>
                                <option value="RegularAttender">Regular Attender</option>
                                <option value="Visitor">Visitor</option>
                                <option value="YouthParentNonNc">Youth Parent Non-NC</option>
                                <option value="Youth">Youth</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                            <select
                                value={formData.ageGroup}
                                onChange={e => setFormData({ ...formData, ageGroup: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            >
                                <option value="Adult">Adult</option>
                                <option value="Youth">Youth</option>
                                <option value="Child">Child</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            placeholder="555-0123"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Groups</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                            {groups.map(group => {
                                const isSelected = formData.selectedGroups.includes(group.id)
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => toggleGroup(group.id)}
                                        className={`px-3 py-1.5 text-sm rounded-full transition-colors border ${isSelected
                                            ? 'bg-nc-green text-white border-nc-green'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-nc-green'
                                            }`}
                                    >
                                        {group.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-nc-green text-white rounded-lg hover:bg-opacity-90 font-medium"
                        >
                            Add Person
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

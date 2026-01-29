import { useState } from 'react'

export default function ManageGroupsModal({ groups, onClose, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(null) // group ID to confirm

    const handleDeleteClick = (group) => {
        setConfirmDelete(group)
    }

    const handleConfirmDelete = () => {
        if (confirmDelete) {
            onDelete(confirmDelete.id)
            setConfirmDelete(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Manage Groups</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {confirmDelete ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-4 bg-red-50 rounded-lg space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900">Delete {confirmDelete.name}?</h3>
                            <p className="text-sm text-red-700 mt-1">
                                This will remove {confirmDelete.memberCount} members from this group. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {groups.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No groups found.</p>
                        ) : (
                            groups.map(group => (
                                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{group.name}</h3>
                                        <p className="text-xs text-gray-500">{group.memberCount} members</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteClick(group)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Group"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

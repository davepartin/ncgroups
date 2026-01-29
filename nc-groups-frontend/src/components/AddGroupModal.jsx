import { useState } from 'react'

export default function AddGroupModal({ onClose, onAdd }) {
    const [name, setName] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        onAdd({ name })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4">Add Group</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nc-green focus:outline-none"
                            placeholder="e.g., Youth Group, D-Group: Men"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Tip: Use "D-Group:" or "Ministry Team:" prefixes for automatic categorization.
                        </p>
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
                            Add Group
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

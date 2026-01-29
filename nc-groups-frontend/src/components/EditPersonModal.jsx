import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://ncgroups-api-production.up.railway.app'

export default function EditPersonModal({ person, groups, onClose, onSave }) {
  const [firstName, setFirstName] = useState(person.firstName || '')
  const [lastName, setLastName] = useState(person.lastName || '')
  const [phone, setPhone] = useState(person.phone || '')
  const [email, setEmail] = useState(person.email || '')
  const [ageGroup, setAgeGroup] = useState(person.ageGroup || '')
  const [membershipStatus, setMembershipStatus] = useState(person.membershipStatus || '')
  const [gender, setGender] = useState(person.gender || '')
  const [selectedGroups, setSelectedGroups] = useState(
    person.groups?.map(g => g.id) || []
  )
  const [isOptedOut, setIsOptedOut] = useState(person.isOptedOut || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const token = localStorage.getItem('ncgroups_token')

      const response = await fetch(`${API_BASE}/api/people/${person.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          ageGroup: ageGroup || null,
          membershipStatus: membershipStatus || null,
          gender: gender || null,
          isOptedOut: isOptedOut,
          groupIds: selectedGroups
        })
      })

      console.log('Save request sent, membershipStatus:', membershipStatus)

      const data = await response.json()

      console.log('Save response received:', data)
      console.log('Response membershipStatus:', data.membershipStatus)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update person')
      }

      // Update local state with the response data
      setMembershipStatus(data.membershipStatus || '')

      onSave(data)
      onClose()
    } catch (err) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to update person')
    } finally {
      setSaving(false)
    }
  }

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-nc-ink">Edit Person</h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              />
            </div>
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 digits"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              />
            </div>
          </div>

          {/* Demographics Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Membership Status
              </label>
              <select
                value={membershipStatus}
                onChange={(e) => setMembershipStatus(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              >
                <option value="">Not Set</option>
                <option value="Member">Member</option>
                <option value="RegularAttender">Regular Attender</option>
                <option value="Youth">Youth</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age Group
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              >
                <option value="">Not Set</option>
                <option value="Adult">Adult</option>
                <option value="Youth">Youth</option>
                <option value="Child">Child</option>
              </select>
            </div>
          </div>

          {/* Demographics Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              >
                <option value="">Not Set</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Opt-Out Toggle */}
          <div
            className={`p-3 rounded-lg border-2 ${isOptedOut ? 'border-nc-rose bg-nc-rose/5' : 'border-gray-200'}`}
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className={`font-medium ${isOptedOut ? 'text-nc-rose' : 'text-gray-700'}`}>
                  Opted Out of Texts
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isOptedOut ? 'Will not receive text blasts' : 'Will receive text blasts'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOptedOut(!isOptedOut)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOptedOut ? 'bg-nc-rose' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOptedOut ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </label>
          </div>

          {/* Groups */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Groups ({selectedGroups.length} selected)
            </label>
            <div className="border-2 border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {groups.map(group => (
                  <label
                    key={group.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedGroups.includes(group.id)
                      ? 'bg-nc-green/10 text-nc-green'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className="w-4 h-4 text-nc-green rounded focus:ring-nc-green"
                    />
                    <span className="text-sm truncate">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-nc-rose/10 text-nc-rose text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-nc-green text-white rounded-lg hover:bg-opacity-90 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

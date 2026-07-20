import { useState, useEffect } from 'react'
import ConfirmDialog from './ConfirmDialog'

const API_BASE = import.meta.env.VITE_API_URL || 'https://ncgroups-api-production.up.railway.app'

export default function EditPersonModal({ person, groups, onClose, onSave, onDelete }) {
  const sourceManaged = Boolean(person.sourceManaged)
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
  const [smsConsentStatus, setSmsConsentStatus] = useState(person.smsConsentStatus || (person.isOptedOut ? 'OptedOut' : 'Legacy'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = async () => {
    if (!sourceManaged && (!firstName.trim() || !lastName.trim())) {
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
        body: JSON.stringify(sourceManaged ? {
          smsConsentStatus
        } : {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          ageGroup: ageGroup || null,
          membershipStatus: membershipStatus || null,
          gender: gender || null,
          smsConsentStatus,
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

  const handleDelete = async () => {
    setSaving(true)
    setShowDeleteConfirm(false)
    try {
      await onDelete(person.id)
      onClose()
    } catch (err) {
      setError('Failed to delete person')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-nc-ink">{sourceManaged ? 'Person Details' : 'Edit Person'}</h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sourceManaged && (
            <div className="bg-nc-blue/10 text-nc-blue px-4 py-3 rounded-lg text-sm">
              Contact information and groups are managed by the NC Vault. Text consent is managed here and through START or STOP replies.
            </div>
          )}
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
                disabled={sourceManaged}
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
                disabled={sourceManaged}
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
                disabled={sourceManaged}
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
                disabled={sourceManaged}
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
                disabled={sourceManaged}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              >
                <option value="">Not Set</option>
                <option value="Member">Member</option>
                <option value="MemberChild">Member Child</option>
                <option value="RegularAttender">Regular Attender</option>
                <option value="RegularAttenderChild">Regular Attender Child</option>
                <option value="Visitor">Visitor</option>
                <option value="VisitorChild">Visitor Child</option>
                <option value="FourthCircle">Fourth Circle</option>
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
                disabled={sourceManaged}
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
                disabled={sourceManaged}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
              >
                <option value="">Not Set</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Text Consent */}
          <div className="p-3 rounded-lg border-2 border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Consent
            </label>
            <select
              value={smsConsentStatus}
              onChange={(event) => setSmsConsentStatus(event.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-nc-green focus:outline-none"
            >
              <option value="Unknown">Unknown / do not text</option>
              <option value="Legacy">Existing approved list</option>
              <option value="OptedIn">Opted in</option>
              <option value="OptedOut">Opted out</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              START records an opt-in. STOP records an opt-out for everyone sharing this phone number.
            </p>
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
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${sourceManaged ? 'opacity-70' : 'cursor-pointer'} ${selectedGroups.includes(group.id)
                      ? 'bg-nc-green/10 text-nc-green'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      disabled={sourceManaged}
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
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          {sourceManaged ? <span /> : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="text-nc-rose text-sm font-medium hover:underline disabled:opacity-50"
            >
              Delete Person
            </button>
          )}

          <div className="flex gap-3">
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
                  sourceManaged ? 'Save Text Preference' : 'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Person"
        message="Are you sure you want to delete this person? This cannot be undone."
        confirmText="Delete Person"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

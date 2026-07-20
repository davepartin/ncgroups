import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://ncgroups-api-production.up.railway.app'

export default function TextBlastModal({ recipients, filters, filterDescription, recipientCount, onClose }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    setSending(true)
    setError('')

    try {
      const token = localStorage.getItem('ncgroups_token')

      // Extract IDs from the recipients list (WYSIWYG)
      // This ensures we only email exactly who is filtered on screen
      const recipientIds = recipients.map(r => r.id)

      const response = await fetch(`${API_BASE}/api/text-blast/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: message.trim(),
          recipientIds, // Explicit list of IDs
          // Pass filters just for logging/context if needed by backend, 
          // but backend will prioritize recipientIds
          groupIds: filters.groupIds,
          gender: filters.gender,
          ageGroup: filters.ageGroup
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send text blast')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to send text blast')
    } finally {
      setSending(false)
    }
  }

  const charCount = message.length
  const isOverLimit = charCount > 1600

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold mb-2">Send Text Blast</h2>
        <p className="text-gray-600 mb-4">
          Sending to <span className="font-semibold text-nc-green">{recipientCount}</span> unique phone number{recipientCount === 1 ? '' : 's'}: <span className="font-medium">{filterDescription}</span>
        </p>

        {success ? (
          <div className="bg-nc-green/10 text-nc-green px-4 py-6 rounded-xl text-center">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-semibold">Text blast sent successfully!</p>
          </div>
        ) : (
          <>
            <textarea
              className={`w-full h-32 p-3 border-2 rounded-lg mb-2 focus:outline-none transition-colors ${isOverLimit
                ? 'border-nc-rose focus:border-nc-rose'
                : 'border-gray-200 focus:border-nc-green'
                }`}
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />

            <div className="flex justify-between items-center mb-4">
              <span className={`text-sm ${isOverLimit ? 'text-nc-rose font-medium' : 'text-gray-500'}`}>
                {charCount}/1600 characters
              </span>
              <span className="text-sm text-gray-500">
                Est. cost: ${(recipientCount * 0.01).toFixed(2)}
              </span>
            </div>

            {error && (
              <div className="bg-nc-rose/10 text-nc-rose text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || isOverLimit || !message.trim()}
                className="px-4 py-2 bg-nc-green text-white rounded-lg hover:bg-opacity-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Blast'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

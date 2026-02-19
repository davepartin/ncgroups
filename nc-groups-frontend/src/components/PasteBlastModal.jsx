import { useState, useMemo } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://ncgroups-api-production.up.railway.app'

// Parse a raw paste of phone numbers into a clean deduplicated list
function parsePhones(raw) {
  return [...new Set(
    raw
      .split(/[\s,;|\n]+/)          // split on commas, spaces, newlines, pipes, semicolons
      .map(p => p.replace(/\D/g, ''))  // strip non-digits
      .map(p => p.length === 11 && p.startsWith('1') ? p.slice(1) : p) // strip leading 1
      .filter(p => p.length === 10)    // only valid 10-digit numbers
  )]
}

export default function PasteBlastModal({ onClose }) {
  const [rawNumbers, setRawNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const phones = useMemo(() => parsePhones(rawNumbers), [rawNumbers])
  const charCount = message.length
  const isOverLimit = charCount > 1600
  const canSend = phones.length > 0 && message.trim().length > 0 && !isOverLimit && !sending

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    setError('')

    try {
      const token = localStorage.getItem('ncgroups_token')
      const response = await fetch(`${API_BASE}/api/text-blast/send-to-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: message.trim(), phones })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send')
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to send text blast')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Paste &amp; Text</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          /* Success state */
          <div className="bg-nc-green/10 text-nc-green px-4 py-6 rounded-xl text-center">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-semibold text-lg">Sent!</p>
            <p className="text-sm mt-1">
              {result.sentCount} messages sent · Est. cost {result.cost}
            </p>
            {result.failedCount > 0 && (
              <p className="text-sm text-nc-rose mt-1">{result.failedCount} failed to send</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-nc-green text-white rounded-lg font-medium hover:bg-opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Phone numbers input */}
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Paste phone numbers
            </label>
            <textarea
              className="w-full h-28 p-3 border-2 border-gray-200 focus:border-nc-green focus:outline-none rounded-lg mb-1 text-sm font-mono transition-colors"
              placeholder="Paste numbers here — any format works&#10;9135551234, 9136665678, (913) 888-9012..."
              value={rawNumbers}
              onChange={e => setRawNumbers(e.target.value)}
              disabled={sending}
            />
            <p className={`text-sm mb-4 ${phones.length > 0 ? 'text-nc-green font-medium' : 'text-gray-400'}`}>
              {phones.length > 0
                ? `✓ ${phones.length} valid number${phones.length === 1 ? '' : 's'} detected`
                : 'No valid numbers yet'}
            </p>

            {/* Message input */}
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Message
            </label>
            <textarea
              className={`w-full h-32 p-3 border-2 rounded-lg mb-2 focus:outline-none transition-colors ${
                isOverLimit ? 'border-nc-rose focus:border-nc-rose' : 'border-gray-200 focus:border-nc-green'
              }`}
              placeholder="Type your message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={sending}
            />
            <div className="flex justify-between items-center mb-1">
              <span className={`text-sm ${isOverLimit ? 'text-nc-rose font-medium' : 'text-gray-500'}`}>
                {charCount}/1600 characters
              </span>
              {phones.length > 0 && (
                <span className="text-sm text-gray-500">
                  Est. cost: ${(phones.length * 0.01).toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">"Reply STOP to opt out" is added automatically</p>

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
                disabled={!canSend}
                className="px-4 py-2 bg-nc-blue text-white rounded-lg hover:bg-opacity-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  `Send to ${phones.length > 0 ? phones.length : '—'} number${phones.length === 1 ? '' : 's'}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

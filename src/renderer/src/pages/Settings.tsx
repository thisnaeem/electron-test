import { useGemini } from '../context/useGemini'
import { FormEvent } from 'react'

const Settings = (): React.JSX.Element => {
  const { apiKey, setApiKey, validateApiKey, isApiKeyValid } = useGemini()

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (apiKey) {
      await validateApiKey(apiKey)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-2xl font-bold">Settings</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="apiKey" className="font-medium">
            Gemini API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Enter your Gemini API key"
          />
          {isApiKeyValid && (
            <span className="text-sm text-green-600 dark:text-green-400">
              API key is valid
            </span>
          )}
        </div>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Validate API Key
        </button>
      </form>
    </div>
  )
}

export default Settings

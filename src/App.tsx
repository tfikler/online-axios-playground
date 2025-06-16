import React, { useState } from 'react'
import { Send, Plus, Trash2, Code, Globe, Copy } from 'lucide-react'
import axios, { AxiosResponse, AxiosError } from 'axios'

interface Header {
  key: string
  value: string
}

interface RequestConfig {
  method: string
  url: string
  headers: Header[]
  body: string
  timeout: number
}

interface ResponseData {
  data: any
  status: number
  statusText: string
  headers: any
  duration: number
  error?: {
    message: string
    type: string
    code?: string
    details?: string
    suggestions?: string[]
  }
}

// Custom JSON Viewer Component
const JsonViewer: React.FC<{ data: any; title?: string }> = ({ data, title }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatJson = (obj: any, indent = 0): JSX.Element[] => {
    const result: JSX.Element[] = []
    
    if (obj === null) {
      result.push(<span key="null" className="text-gray-400">null</span>)
    } else if (typeof obj === 'string') {
      result.push(<span key="string" className="text-green-400">"{obj}"</span>)
    } else if (typeof obj === 'number') {
      result.push(<span key="number" className="text-blue-400">{obj}</span>)
    } else if (typeof obj === 'boolean') {
      result.push(<span key="boolean" className="text-purple-400">{obj.toString()}</span>)
    } else if (Array.isArray(obj)) {
      result.push(<span key="array-start" className="text-yellow-400">[</span>)
      obj.forEach((item, index) => {
        result.push(
          <div key={`array-${index}`} style={{ marginLeft: `${(indent + 1) * 20}px` }}>
            {formatJson(item, indent + 1)}
            {index < obj.length - 1 && <span className="text-gray-400">,</span>}
          </div>
        )
      })
      result.push(<span key="array-end" className="text-yellow-400">]</span>)
    } else if (typeof obj === 'object') {
      const keys = Object.keys(obj)
      result.push(<span key="object-start" className="text-yellow-400">{'{'}</span>)
      keys.forEach((key, index) => {
        result.push(
          <div key={`object-${key}`} style={{ marginLeft: `${(indent + 1) * 20}px` }}>
            <span className="text-red-400">"{key}"</span>
            <span className="text-gray-400">: </span>
            {formatJson(obj[key], indent + 1)}
            {index < keys.length - 1 && <span className="text-gray-400">,</span>}
          </div>
        )
      })
      result.push(<span key="object-end" className="text-yellow-400">{'}'}</span>)
    }
    
    return result
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2">
        <button
          onClick={copyToClipboard}
          className="btn-secondary p-2 text-xs flex items-center gap-1"
          title="Copy to clipboard"
        >
          <Copy size={14} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
        <div>{formatJson(data)}</div>
      </div>
    </div>
  )
}

function App() {
  const [config, setConfig] = useState<RequestConfig>({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    body: '',
    timeout: 5000
  })

  const [response, setResponse] = useState<ResponseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [useCorsProxy, setUseCorsProxy] = useState(false)
  const [corsProxyUrl, setCorsProxyUrl] = useState('https://cors-anywhere.herokuapp.com/')

  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

  const addHeader = () => {
    setConfig(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }]
    }))
  }

  const removeHeader = (index: number) => {
    setConfig(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }))
  }

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setConfig(prev => ({
      ...prev,
      headers: prev.headers.map((header, i) => 
        i === index ? { ...header, [field]: value } : header
      )
    }))
  }

  const makeRequest = async () => {
    setLoading(true)
    const startTime = Date.now()

    try {
      // Prepare enhanced browser headers to bypass sophisticated bot detection
      const browserHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Referer': 'https://www.google.com/',
        'Origin': 'https://www.google.com'
      }

      // Add custom headers from user (these will override browser headers if same key)
      const headers: Record<string, string> = { ...browserHeaders }
      config.headers.forEach(header => {
        if (header.key && header.value) {
          headers[header.key] = header.value
        }
      })

      // For GET requests, ensure we have the right Accept header for HTML content
      if (config.method === 'GET' && !config.headers.some(h => h.key.toLowerCase() === 'accept')) {
        headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }

      // Prepare request data
      let data = undefined
      if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body) {
        try {
          data = JSON.parse(config.body)
        } catch {
          data = config.body
        }
      }

      // Use CORS proxy if enabled
      const finalUrl = useCorsProxy 
        ? `${corsProxyUrl}${config.url}` 
        : config.url

      const axiosConfig = {
        method: config.method.toLowerCase(),
        url: finalUrl,
        headers,
        data,
        timeout: config.timeout
      }

      const response: AxiosResponse = await axios(axiosConfig)
      const duration = Date.now() - startTime

      setResponse({
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        duration
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const axiosError = error as AxiosError

      // Determine error type and provide helpful information
      let errorInfo = {
        message: axiosError.message,
        type: 'Unknown Error',
        code: axiosError.code,
        details: '',
        suggestions: [] as string[]
      }

      if (axiosError.code === 'ERR_NETWORK') {
        errorInfo = {
          ...errorInfo,
          type: 'Network Error',
          details: 'Failed to connect to the server. This could be due to network issues or CORS policy.',
          suggestions: [
            'Check if the URL is correct and accessible',
            'Try enabling the CORS proxy option',
            'Verify your internet connection',
            'Check if the server is running and accessible'
          ]
        }
      } else if (axiosError.code === 'ECONNABORTED') {
        errorInfo = {
          ...errorInfo,
          type: 'Timeout Error',
          details: `Request timed out after ${config.timeout}ms`,
          suggestions: [
            'Increase the timeout value',
            'Check if the server is responding slowly',
            'Verify the URL is correct'
          ]
        }
      } else if (axiosError.message.includes('CORS')) {
        errorInfo = {
          ...errorInfo,
          type: 'CORS Error',
          details: 'Cross-Origin Resource Sharing (CORS) policy blocked this request.',
          suggestions: [
            'Enable the "Use CORS Proxy" option',
            'Use APIs that support CORS (try the quick test URLs)',
            'Contact the API provider to enable CORS for your domain'
          ]
        }
      } else if (axiosError.response?.status) {
        const status = axiosError.response.status
        if (status >= 400 && status < 500) {
          if (status === 403) {
            errorInfo = {
              ...errorInfo,
              type: 'Access Forbidden (403)',
              details: 'The server understood the request but refused to authorize it. This often indicates bot detection.',
              suggestions: [
                'Enable CORS proxy and try different proxy servers',
                'The site may have sophisticated bot detection',
                'Try adding more specific headers (cookies, referrer)',
                'Some sites require authentication or specific user sessions',
                'Consider using a different testing API that allows programmatic access'
              ]
            }
          } else {
            errorInfo = {
              ...errorInfo,
              type: 'Client Error',
              details: `HTTP ${status}: ${axiosError.response.statusText}`,
              suggestions: [
                'Check the request URL and parameters',
                'Verify authentication headers if required',
                'Review the request method and body format'
              ]
            }
          }
        } else if (status >= 500) {
          errorInfo = {
            ...errorInfo,
            type: 'Server Error',
            details: `HTTP ${status}: ${axiosError.response.statusText}`,
            suggestions: [
              'The server is experiencing issues',
              'Try again later',
              'Contact the API provider if the issue persists'
            ]
          }
        }
      }

      setResponse({
        data: axiosError.response?.data || null,
        status: axiosError.response?.status || 0,
        statusText: axiosError.response?.statusText || 'Error',
        headers: axiosError.response?.headers || {},
        duration,
        error: errorInfo
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 400 && status < 500) return 'text-yellow-600'
    if (status >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Globe className="text-blue-600" />
            Online Axios Playground
          </h1>
          <p className="text-gray-600 mb-2">
            Free HTTP Request Testing Tool - Test APIs, Handle CORS, View JSON Responses
          </p>
          <p className="text-sm text-gray-500">
            Perfect for testing REST APIs, debugging HTTP requests, and exploring web services
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Request Configuration */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Code className="text-blue-600" />
              HTTP Request Builder
            </h2>

            {/* Method and URL */}
            <div className="flex gap-4 mb-6">
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                <select
                  className="select"
                  value={config.method}
                  onChange={(e) => setConfig(prev => ({ ...prev, method: e.target.value }))}
                >
                  {httpMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                <input
                  type="text"
                  className="input"
                  value={config.url}
                  onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://api.example.com/endpoint"
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Quick test URLs (CORS-enabled):</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'https://httpbin.org/get',
                      'https://catfact.ninja/fact',
                      'https://api.github.com/users/octocat',
                      'https://restcountries.com/v3.1/name/canada'
                    ].map(url => (
                      <button
                        key={url}
                        onClick={() => setConfig(prev => ({ ...prev, url }))}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        {url.split('/')[2]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Headers */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Headers</label>
                <button
                  onClick={addHeader}
                  className="btn btn-secondary text-sm flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Header
                </button>
              </div>
              <div className="space-y-2">
                {config.headers.map((header, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    />
                    <button
                      onClick={() => removeHeader(index)}
                      className="btn btn-danger p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body */}
            {['POST', 'PUT', 'PATCH'].includes(config.method) && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Body</label>
                <textarea
                  className="input h-32 resize-none font-mono text-sm"
                  value={config.body}
                  onChange={(e) => setConfig(prev => ({ ...prev, body: e.target.value }))}
                  placeholder='{"key": "value"}'
                />
              </div>
            )}

            {/* Timeout */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeout (ms)</label>
              <input
                type="number"
                className="input w-32"
                value={config.timeout}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 5000 }))}
                min="1000"
                max="30000"
              />
            </div>

            {/* CORS Proxy Option */}
            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCorsProxy}
                  onChange={(e) => setUseCorsProxy(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Use CORS Proxy (for sites that block cross-origin requests)
                </span>
              </label>
              
              {useCorsProxy && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proxy Server</label>
                  <select
                    className="select w-full"
                    value={corsProxyUrl}
                    onChange={(e) => setCorsProxyUrl(e.target.value)}
                  >
                    <option value="https://cors-anywhere.herokuapp.com/">CORS Anywhere (Heroku)</option>
                    <option value="https://api.allorigins.win/raw?url=">AllOrigins</option>
                    <option value="https://corsproxy.io/?">CORS Proxy IO</option>
                    <option value="https://proxy.cors.sh/">CORS.sh</option>
                  </select>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                Routes requests through a proxy to bypass CORS restrictions and bot detection.
                Try different proxies if one doesn't work.
              </p>
            </div>

            {/* Browser Headers Info */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-1">🌐 Browser-Like Requests</p>
              <p className="text-xs text-blue-700 mb-2">
                All requests automatically include realistic browser headers (User-Agent, Accept, etc.) 
                to make them appear as if they're coming from a real web browser, not a bot.
              </p>
              <p className="text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">
                <strong>⚠️ Note:</strong> Some sites (like Amazon, Facebook, etc.) have advanced bot detection 
                that may still block requests even with realistic headers. Try different proxy servers or 
                use dedicated testing APIs instead.
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={makeRequest}
              disabled={loading || !config.url}
              className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Request
                </>
              )}
            </button>
          </div>

          {/* Response Display */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">API Response Viewer</h2>

            {response ? (
              <>
                {/* Status Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className={`text-lg font-bold ${getStatusColor(response.status)}`}>
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Duration:</span>
                    <span className="text-sm text-gray-600">{response.duration}ms</span>
                  </div>
                  {response.error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-lg font-semibold text-red-700">{response.error.type}</span>
                        {response.error.code && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-mono">
                            {response.error.code}
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-red-700 mb-1">Message:</p>
                        <p className="text-sm text-red-600">{response.error.message}</p>
                      </div>

                      {response.error.details && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-red-700 mb-1">Details:</p>
                          <p className="text-sm text-red-600">{response.error.details}</p>
                        </div>
                      )}

                      {response.error.suggestions && response.error.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-2">💡 Suggestions:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {response.error.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-red-600">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Request Headers */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Headers Sent</h3>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-40">
                    <div className="space-y-1">
                      <div className="text-green-400">// Browser-like headers automatically added:</div>
                      <div className="text-blue-400">User-Agent: <span className="text-white">Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...</span></div>
                      <div className="text-blue-400">Accept: <span className="text-white">text/html,application/xhtml+xml,application/xml...</span></div>
                      <div className="text-blue-400">Accept-Language: <span className="text-white">en-US,en;q=0.9</span></div>
                      <div className="text-green-400">// + Your custom headers</div>
                    </div>
                  </div>
                </div>

                {/* Response Headers */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Response Headers</h3>
                  <JsonViewer data={response.headers} />
                </div>

                {/* Response Body */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Response Body</h3>
                  <JsonViewer data={response.data} />
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Send size={48} className="mx-auto mb-4 opacity-50" />
                <p>Send a request to see the response here</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200">
          <div className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
              <span>© 2024 Tomer Fikler. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">|</span>
                <span>Open Source Axios Testing Tool</span>
                <span className="text-gray-400">|</span>
                <span>Built with React & TypeScript</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>Free online tool for testing HTTP requests and APIs. No registration required.</p>
              <p className="mt-1">
                Perfect for developers, QA engineers, and anyone working with REST APIs
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App 
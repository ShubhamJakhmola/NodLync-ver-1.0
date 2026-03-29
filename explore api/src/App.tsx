import { useState } from 'react';

// Pre-defined database for recognized domains (Sendblue)
const PRE_DEFINED_ENDPOINTS: Record<string, { id: string; method: string; path: string; description: string; curl: string; body?: string }[]> = {
  'sendblue.com': [
    {
      id: 'sendblue-list-messages',
      method: 'GET',
      path: '/api/v2/messages',
      description: 'Retrieve a list of messages for the authenticated account',
      curl: 'curl https://api.sendblue.co/api/v2/messages \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET"',
      body: '{\n  "is_outbound": false,\n  "limit": 50\n}'
    },
    {
      id: 'sendblue-send-message',
      method: 'POST',
      path: '/api/send-message',
      description: 'Send a new message to a phone number',
      curl: 'curl -X POST https://api.sendblue.co/api/send-message \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"number": "+15551234567", "content": "Hello World", "send_style": "celebration"}\'',
      body: '{\n  "number": "+15551234567",\n  "content": "Hello World",\n  "send_style": "celebration"\n}'
    },
    {
      id: 'sendblue-send-group',
      method: 'POST',
      path: '/api/send-group-message',
      description: 'Send group message',
      curl: 'curl -X POST https://api.sendblue.co/api/send-group-message \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"groupId": "group_123", "content": "Hello team"}\'',
      body: '{\n  "groupId": "group_123",\n  "content": "Hello team"\n}'
    },
    {
      id: 'sendblue-status',
      method: 'GET',
      path: '/api/status',
      description: 'Get message status',
      curl: 'curl https://api.sendblue.co/api/status?message_handle=msg_123 \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET"',
      body: '{\n  "message_handle": "msg_123"\n}'
    },
    {
      id: 'sendblue-evaluate',
      method: 'GET',
      path: '/api/evaluate-service',
      description: 'Check recipient service type (iMessage, SMS)',
      curl: 'curl https://api.sendblue.co/api/evaluate-service?number=+15551234567 \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET"',
      body: '{\n  "number": "+15551234567"\n}'
    }
  ],
  'generic': [
    {
      id: 'gen-list',
      method: 'GET',
      path: '/api/v1/resources',
      description: 'List resources',
      curl: 'curl https://api.example.com/api/v1/resources \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
      body: '{\n  "limit": 10,\n  "offset": 0\n}'
    },
    {
      id: 'gen-create',
      method: 'POST',
      path: '/api/v1/resources',
      description: 'Create a new resource',
      curl: 'curl -X POST https://api.example.com/api/v1/resources \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "New Resource"}\'',
      body: '{\n  "name": "New Resource"\n}'
    },
    {
      id: 'gen-get',
      method: 'GET',
      path: '/api/v1/resources/{id}',
      description: 'Get details of a single resource',
      curl: 'curl https://api.example.com/api/v1/resources/1 \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
      body: '{\n  "id": "1"\n}'
    }
  ]
};

export default function App() {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState(''); // Some like Sendblue need two
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<typeof PRE_DEFINED_ENDPOINTS['generic']>([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [activeTestEndpoint, setActiveTestEndpoint] = useState<string | null>(null);

  const handleFetchEndpoints = () => {
    if (!docUrl) return;
    setLoading(true);

    // Simulate URL parsing
    setTimeout(() => {
      let resolvedEndpoints = PRE_DEFINED_ENDPOINTS['generic'];
      if (docUrl.toLowerCase().includes('sendblue.com')) {
        resolvedEndpoints = PRE_DEFINED_ENDPOINTS['sendblue.com'];
      }
      
      setEndpoints(resolvedEndpoints);
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleSelectEndpointsSubmit = () => {
    if (selectedEndpoints.length === 0) {
      alert('Please select at least one endpoint to proceed.');
      return;
    }
    setStep(3);
    setActiveTestEndpoint(selectedEndpoints[0]);
  };

  const getEndpointDetails = (id: string) => {
    return endpoints.find(e => e.id === id);
  };

  const getInterpolatedCurl = (endpoint: typeof PRE_DEFINED_ENDPOINTS['generic'][0]) => {
    let curl = endpoint.curl;
    if (apiKey) {
      curl = curl.replace('YOUR_API_KEY', apiKey);
    }
    if (apiSecret) {
      curl = curl.replace('YOUR_API_SECRET', apiSecret);
    }
    return curl;
  };

  const toggleEndpointSelection = (id: string) => {
    setSelectedEndpoints(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              API
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Endpoint Workspace Generator</h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className={`h-2 w-2 rounded-full ${step === 3 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className="ml-2">Step {step} of 3</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Step 1: Input URL and API Key */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold mb-2">Connect Your API</h2>
            <p className="text-slate-600 mb-8">Enter your API credentials and documentation URL. We will parse the endpoints for your testing workspace.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key / ID</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API Key or ID"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Secret (if required)</label>
                <input 
                  type="password" 
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter secret key (required for some APIs like Sendblue)"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Documentation URL</label>
                <div className="flex space-x-2">
                  <input 
                    type="url" 
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://docs.example.com/api"
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Try pasting: <span className="font-mono text-indigo-600 select-all">https://docs.sendblue.com/api/resources/messages/methods/list</span></p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleFetchEndpoints}
                  disabled={!docUrl || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Parsing Documentation...
                    </>
                  ) : (
                    "Extract Endpoints"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Endpoints */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">Select Endpoints to Test</h2>
              <button 
                onClick={() => setStep(1)} 
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                ← Edit Credentials
              </button>
            </div>
            <p className="text-slate-600 mb-8">We found {endpoints.length} endpoints. Choose the ones you want to create templates for.</p>

            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-8 pr-2">
              {endpoints.map((ep) => (
                <div 
                  key={ep.id}
                  onClick={() => toggleEndpointSelection(ep.id)}
                  className={`p-4 border rounded-xl cursor-pointer flex items-start space-x-3 transition-colors ${
                    selectedEndpoints.includes(ep.id) 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedEndpoints.includes(ep.id)
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-slate-300'
                  }`}>
                    {selectedEndpoints.includes(ep.id) && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        ep.method === 'GET' ? 'bg-green-100 text-green-800' :
                        ep.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-medium text-slate-800 truncate">{ep.path}</span>
                    </div>
                    <p className="text-xs text-slate-500">{ep.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleSelectEndpointsSubmit}
                disabled={selectedEndpoints.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors"
              >
                Generate Test Workspace
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Test Workspace with Dropdown & Curl/Body */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">API Test Workspace</h2>
                <p className="text-sm text-slate-600">Generated workspace for your selected endpoints.</p>
              </div>
              <button 
                onClick={() => setStep(2)} 
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                ← Back to Selection
              </button>
            </div>

            {/* Selected Endpoints Dropdown-like UI selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Selected Endpoint to Inspect</label>
              <select 
                value={activeTestEndpoint || ''}
                onChange={(e) => setActiveTestEndpoint(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                {selectedEndpoints.map(id => {
                  const ep = getEndpointDetails(id);
                  return (
                    <option key={id} value={id}>
                      {ep?.method} {ep?.path}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Detail Panel */}
            {activeTestEndpoint && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
                <div className="p-6">
                  {(() => {
                    const ep = getEndpointDetails(activeTestEndpoint);
                    if (!ep) return null;
                    return (
                      <>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                            ep.method === 'GET' ? 'bg-green-100 text-green-800' :
                            ep.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {ep.method}
                          </span>
                          <span className="font-mono text-base font-semibold text-slate-800">{ep.path}</span>
                        </div>
                        <p className="text-slate-600 text-sm">{ep.description}</p>
                      </>
                    );
                  })()}
                </div>

                <div className="p-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                    <svg className="h-4 w-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                    </svg>
                    Required cURL Command
                  </h3>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 text-xs sm:text-sm font-mono p-4 rounded-lg overflow-x-auto">
                      {getEndpointDetails(activeTestEndpoint) ? getInterpolatedCurl(getEndpointDetails(activeTestEndpoint)!) : ''}
                    </pre>
                    <button 
                      onClick={() => {
                        const ep = getEndpointDetails(activeTestEndpoint);
                        if (ep) {
                          navigator.clipboard.writeText(getInterpolatedCurl(ep));
                          alert("Copied cURL to clipboard!");
                        }
                      }}
                      className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {getEndpointDetails(activeTestEndpoint)?.body && (
                  <div className="p-6">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                      <svg className="h-4 w-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m7 7l-7-7 7-7" />
                      </svg>
                      Sample JSON Payload
                    </h3>
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 text-xs sm:text-sm font-mono p-4 rounded-lg overflow-x-auto">
                        {getEndpointDetails(activeTestEndpoint)?.body}
                      </pre>
                      <button 
                        onClick={() => {
                          const ep = getEndpointDetails(activeTestEndpoint);
                          if (ep?.body) {
                            navigator.clipboard.writeText(ep.body);
                            alert("Copied Payload to clipboard!");
                          }
                        }}
                        className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs"
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

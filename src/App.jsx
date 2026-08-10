import React, { useState, useRef, useEffect } from 'react';

const LEGAL_KNOWLEDGE_BASE = [
  {
    category: 'police',
    keywords: ['arrest', 'detain', 'police custody', 'handcuff', 'grounds of arrest', 'bail'],
    title: 'Arrest & Detention Rights (BNSS / CrPC)',
    description: 'Know your rights regarding police detention, legal counsel, and bail provisions.'
  },
  {
    category: 'police',
    keywords: ['fir', 'refuse fir', 'police not registering fir', 'zero fir', 'complaint'],
    title: 'FIR Registration & Refusal Remedies',
    description: 'Procedures to file Zero FIRs and legal remedies if police refuse complaints.'
  },
  {
    category: 'tenant',
    keywords: ['tenant', 'landlord', 'eviction', 'forcible eviction', 'lockout', 'rent', 'deposit'],
    title: 'Tenant Protection & Evictions',
    description: 'Protections against unlawful eviction, lockouts, and security deposit returns.'
  },
  {
    category: 'cyber',
    keywords: ['cyber', 'online fraud', 'upi fraud', 'scam', 'phishing', 'blackmail'],
    title: 'Cyber Crime & Online Scams',
    description: 'Action plans for financial fraud, reporting within the golden hour, and helpline 1930.'
  },
  {
    category: 'workplace',
    keywords: ['salary', 'labour', 'workplace', 'fired', 'termination', 'provident fund', 'pf'],
    title: 'Workplace & Employment Rights',
    description: 'Legal rights regarding withheld salary, unlawful termination, and harassment.'
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('nyaya_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('nyaya_is_premium') === 'true';
  });

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionInstanceRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentAudioSourceRef = useRef(null);
  const userIdRef = useRef(`user_${Math.floor(Math.random() * 10000)}`);

  // WebSocket Connection Setup
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:8000/ws/voice/${userIdRef.current}`);
      wsRef.current = ws;

      ws.onopen = () => setStatusMessage('');
      ws.onerror = () => setStatusMessage('⚠️ Server disconnected. Make sure server.py is running.');

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        // 1. Dynamic Text Response from Qdrant + LLM Orchestrator
        if (msg.type === "text_response") {
          setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: msg.text }]);
        } 
        // 2. Audio Streamed directly from Rime AI TTS
        else if (msg.type === "audio_chunk") {
          setIsSpeaking(true);
          await playAudioChunk(msg.data);
        } 
        else if (msg.type === "audio_end") {
          setIsSpeaking(false);
        } 
        else if (msg.type === "interrupted") {
          stopAudioPlayback();
          setIsSpeaking(false);
        }
        else if (msg.type === "audio_fallback_required") {
          // If Rime API Key is missing or fails, use browser fallback synthesis
          const lastMsg = messages[messages.length - 1]?.text;
          if (lastMsg) fallbackSpeakText(lastMsg);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('nyaya_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('nyaya_is_premium', isPremium);
  }, [isPremium]);

  const clearChatHistory = () => {
    setMessages([]);
    localStorage.removeItem('nyaya_chat_messages');
  };

  const stopAudioPlayback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioSourceRef.current) {
      try { currentAudioSourceRef.current.stop(); } catch (e) {}
      currentAudioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const playAudioChunk = async (base64Audio) => {
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      stopAudioPlayback();

      const binary = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(binary.length);
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      currentAudioSourceRef.current = source;
      source.start(0);
      source.onended = () => setIsSpeaking(false);
    } catch (err) {
      console.error("Audio Playback Error:", err);
    }
  };

  const fallbackSpeakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      stopAudioPlayback();
      const cleanText = text.replace(/[*#_•]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  // Fixed Microphone Handler
  const handleMicClick = async () => {
    setStatusMessage('');
    stopAudioPlayback();

    // Signal server to interrupt current response immediately
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }

    if (isRecording) {
      if (recognitionInstanceRef.current) {
        try { recognitionInstanceRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    // Explicitly request permissions first to fix browser mic blocks
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setStatusMessage('⚠️ Microphone access blocked. Click the lock icon in your browser address bar and enable permissions.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage('⚠️ Speech recognition not supported in this browser. Please use Google Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionInstanceRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
        setStatusMessage('🎙️ Listening... Speak your query.');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setStatusMessage('⚠️ Mic access denied by browser.');
        } else if (event.error === 'no-speech') {
          setStatusMessage('⚠️ No speech detected. Try again.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      setStatusMessage('⚠️ Could not start microphone.');
      setIsRecording(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = (topicTitle = '', initialQuery = '') => {
    stopAudioPlayback();
    const welcomeMsg = topicTitle
      ? `Welcome. Let's review **${topicTitle}**. How can I assist you with this matter?`
      : "Hello, I am Nyaya-Mitra. How may I assist you with your legal rights today?";

    if (initialQuery) {
      handleSendQuery(initialQuery);
    } else if (messages.length === 0) {
      setMessages([{ id: Date.now(), sender: 'bot', text: welcomeMsg }]);
    }
    setCurrentView('chat');
  };

  const handleSendQuery = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    if (isRecording && recognitionInstanceRef.current) {
      try { recognitionInstanceRef.current.stop(); } catch (e) {}
      setIsRecording(false);
    }
    stopAudioPlayback();

    // 1. Immediately append user query to chat screen
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: query }]);
    setInput('');

    // 2. Dispatch query to FastAPI orchestrator over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "text_prompt",
        text: query
      }));
    } else {
      setStatusMessage('⚠️ Server offline. Please start backend via python server.py.');
    }
  };

  const filterTopics = selectedCategory === 'all'
    ? LEGAL_KNOWLEDGE_BASE
    : LEGAL_KNOWLEDGE_BASE.filter(item => item.category === selectedCategory);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#0a0f0d',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 24px',
        borderBottom: '1px solid #1f2937',
        backgroundColor: '#070b09',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
          <span style={{ fontSize: '22px' }}>⚖️</span>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#ffffff' }}>Nyaya-Mitra</h1>
            <p style={{ fontSize: '11px', color: '#34d399', margin: 0 }}>Rime AI & Qdrant Voice Agent</p>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setCurrentView('home')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: currentView === 'home' ? '#1f2937' : 'transparent', color: currentView === 'home' ? '#34d399' : '#9ca3af', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            🏠 Home
          </button>
          <button onClick={() => setCurrentView('topics')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: currentView === 'topics' ? '#1f2937' : 'transparent', color: currentView === 'topics' ? '#34d399' : '#9ca3af', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            📖 Directory
          </button>
          <button onClick={() => setShowPremiumModal(true)} style={{ padding: '6px 14px', borderRadius: '9999px', border: '1px solid rgba(52, 211, 153, 0.4)', backgroundColor: isPremium ? '#34d399' : 'rgba(52, 211, 153, 0.1)', color: isPremium ? '#090d0b' : '#34d399', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            {isPremium ? '✨ Pro Active' : '✨ Upgrade to Pro'}
          </button>
        </nav>
      </header>

      {/* VIEW 1: HOME */}
      {currentView === 'home' && (
        <main style={{ maxWidth: '850px', width: '100%', margin: '0 auto', padding: '36px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
          <span style={{ padding: '4px 14px', borderRadius: '9999px', backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#6ee7b7', fontSize: '12px', fontWeight: '600', marginBottom: '20px' }}>
            ✓ Low-Latency Rime Voice & Qdrant Semantic Retrieval
          </span>

          <h2 style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1.2', margin: '0 0 16px 0' }}>
            Know your rights.<br />
            <span style={{ color: '#34d399' }}>Speak or type to get legal solutions.</span>
          </h2>

          <p style={{ fontSize: '14px', color: '#9ca3af', maxWidth: '550px', margin: '0 0 28px 0', lineHeight: '1.6' }}>
            Clear assistance for arrest rights, landlord disputes, cyber fraud, traffic rules, and workplace protections.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '36px' }}>
            <button onClick={() => startChat()} style={{ padding: '12px 28px', borderRadius: '9999px', backgroundColor: '#34d399', color: '#0a0f0d', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
              🎙️ Open Voice Assistant {messages.length > 0 && `(${messages.length} saved)`}
            </button>
            <button onClick={() => setCurrentView('topics')} style={{ padding: '12px 22px', borderRadius: '9999px', backgroundColor: '#111827', border: '1px solid #374151', color: '#e5e7eb', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
              📖 Browse Legal Directory
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', width: '100%', textAlign: 'left' }}>
            {LEGAL_KNOWLEDGE_BASE.map((item, idx) => (
              <div key={idx} onClick={() => startChat(item.title, item.keywords[0])} style={{ padding: '18px', borderRadius: '12px', backgroundColor: '#111827', border: '1px solid #1f2937', cursor: 'pointer' }}>
                <h3 style={{ fontSize: '15px', color: '#34d399', margin: '0 0 6px 0' }}>{item.title}</h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW 2: LEGAL DIRECTORY */}
      {currentView === 'topics' && (
        <main style={{ maxWidth: '850px', width: '100%', margin: '0 auto', padding: '28px 20px', flex: 1, boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Legal Procedures Directory</h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>Filter procedures or choose any topic to start guidance.</p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {['all', 'police', 'tenant', 'cyber', 'workplace'].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '6px 14px', borderRadius: '9999px', border: '1px solid #1f2937', backgroundColor: selectedCategory === cat ? '#34d399' : '#111827', color: selectedCategory === cat ? '#0a0f0d' : '#d1d5db', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize', cursor: 'pointer' }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {filterTopics.map((item, idx) => (
              <div key={idx} style={{ padding: '18px', borderRadius: '12px', backgroundColor: '#111827', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase' }}>{item.category}</span>
                  <h3 style={{ fontSize: '15px', color: '#ffffff', margin: '4px 0 8px 0' }}>{item.title}</h3>
                  <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', margin: '0 0 14px 0' }}>{item.description}</p>
                </div>
                <button onClick={() => startChat(item.title, item.keywords[0])} style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  🎙️ Open Guidance Session
                </button>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW 3: CHAT VIEW */}
      {currentView === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px', backgroundColor: '#0d1310', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { stopAudioPlayback(); setCurrentView('home'); }} style={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#34d399', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
              ← Return Home
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearChatHistory} style={{ backgroundColor: '#1f1917', border: '1px solid #7f1d1d', color: '#f87171', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                🗑️ Clear History
              </button>
              <button onClick={stopAudioPlayback} style={{ backgroundColor: isSpeaking ? 'rgba(239, 68, 68, 0.2)' : 'transparent', border: '1px solid #374151', color: isSpeaking ? '#ef4444' : '#9ca3af', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                {isSpeaking ? '⚡ Interrupt Audio' : '🔈 Audio Idle'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '750px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: '14px', backgroundColor: msg.sender === 'user' ? '#34d399' : '#111827', color: msg.sender === 'user' ? '#0a0f0d' : '#f3f4f6', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line', border: msg.sender === 'bot' ? '1px solid #1f2937' : 'none' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937', backgroundColor: '#070b09' }}>
            {statusMessage && (
              <div style={{ maxWidth: '750px', margin: '0 auto 8px auto', fontSize: '12px', color: '#f87171', textAlign: 'center' }}>
                {statusMessage}
              </div>
            )}
            <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={handleMicClick} 
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '50%', 
                  backgroundColor: isRecording ? '#ef4444' : '#111827', 
                  border: isRecording ? '2px solid #f87171' : '1px solid #374151', 
                  color: '#ffffff', 
                  fontSize: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {isRecording ? '🛑' : '🎙️'}
              </button>
              
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()} 
                placeholder={isRecording ? "Listening to your voice..." : "Type or speak your legal question..."} 
                style={{ flex: 1, padding: '12px 16px', borderRadius: '9999px', backgroundColor: '#111827', border: '1px solid #1f2937', color: '#ffffff', fontSize: '14px', outline: 'none' }} 
              />
              
              <button 
                onClick={() => handleSendQuery()} 
                style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#34d399', border: 'none', color: '#090d0b', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM MODAL */}
      {showPremiumModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '16px', maxWidth: '420px', width: '100%', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', color: '#ffffff', margin: '0 0 6px 0' }}>✨ Nyaya-Mitra Pro Plan</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 20px 0' }}>Full voice access, legal document generators, and advocate assistance.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPremiumModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #374151', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>Close</button>
              <button onClick={() => { setIsPremium(true); setShowPremiumModal(false); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#34d399', color: '#090d0b', fontWeight: '700', cursor: 'pointer' }}>Activate Free Pro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
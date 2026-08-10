import React, { useState, useRef, useEffect } from 'react';

const LEGAL_KNOWLEDGE_BASE = [
  {
    category: 'police',
    keywords: ['arrest', 'detain', 'police custody', 'handcuff', 'grounds of arrest', 'bail'],
    title: 'Arrest & Detention Rights (BNSS / CrPC)',
    response: `**Your Rights During Arrest & Custody:**\n\n` +
      `1. **Right to Know Grounds:** Officers must clearly state charges at arrest.\n` +
      `2. **Right to Legal Counsel:** You can consult a lawyer immediately.\n` +
      `3. **Right to Inform Family:** Police must notify a relative/friend of your location.\n` +
      `4. **Medical Examination:** You have the right to a certified medical exam.\n` +
      `5. **24-Hour Production:** Must be produced before a Magistrate within 24 hours.\n` +
      `6. **Bail Provisions:** Bailable offenses require immediate police bail.\n\n` +
      `*Emergency Helpline:* Dial **112** (Police) or **15100** (NALSA Free Legal Aid).`
  },
  {
    category: 'police',
    keywords: ['fir', 'refuse fir', 'police not registering fir', 'zero fir', 'complaint'],
    title: 'FIR Registration & Refusal Remedies',
    response: `**Filing an FIR & Refusal Remedies:**\n\n` +
      `1. **Zero FIR:** File at ANY police station regardless of location.\n` +
      `2. **Postal Complaint:** Send a written complaint to SP/DCP via Registered Post.\n` +
      `3. **Magistrate Direction:** File under Sec 156(3) CrPC/BNSS via court.\n` +
      `4. **Online Grievance:** Register on state police or NCRB portal.`
  },
  {
    category: 'tenant',
    keywords: ['tenant', 'landlord', 'eviction', 'forcible eviction', 'lockout', 'rent', 'deposit'],
    title: 'Tenant Protection & Evictions',
    response: `**Tenant Rights Against Illegal Eviction:**\n\n` +
      `1. **No Forced Lockouts:** Landlords cannot evict without a civil court order.\n` +
      `2. **Notice Period:** Formal written notice (15-30 days) is required.\n` +
      `3. **Deposit Refund:** Refund mandatory within 30 days of vacating.\n` +
      `4. **Legal Remedy:** File police complaint for trespass or urgent civil injunction.`
  },
  {
    category: 'cyber',
    keywords: ['cyber', 'online fraud', 'upi fraud', 'scam', 'phishing', 'blackmail'],
    title: 'Cyber Crime & Online Scams',
    response: `**Action Plan for Cyber Fraud:**\n\n` +
      `1. **Golden Hour:** Report financial scams within 1 hour.\n` +
      `2. **National Cyber Helpline:** Call **1930** or log on to **cybercrime.gov.in**.\n` +
      `3. **Bank Notice:** Notify bank fraud division immediately to freeze transactions.`
  },
  {
    category: 'workplace',
    keywords: ['salary', 'labour', 'workplace', 'fired', 'termination', 'provident fund', 'pf'],
    title: 'Workplace & Employment Rights',
    response: `**Workplace Protections:**\n\n` +
      `1. **Salary Withheld:** Issue notice under Payment of Wages Act or SAMADHAN portal.\n` +
      `2. **Unlawful Termination:** Severance pay and notice period mandatory by law.\n` +
      `3. **Harassment:** Contact Internal Complaints Committee (POSH) or District Legal Officer.`
  }
];

function getLegalResponse(query) {
  const lower = query.toLowerCase();
  for (const item of LEGAL_KNOWLEDGE_BASE) {
    if (item.keywords.some(kw => lower.includes(kw))) {
      return item.response;
    }
  }
  return `**Nyaya-Mitra Guidance:**\n\nRegarding "${query}":\n` +
    `1. The law guarantees legal due process under Article 14.\n` +
    `2. Keep copies of all records, receipts, messages, and official communications.\n` +
    `3. Access free legal aid representation via NALSA (15100).\n\n` +
    `*Emergency Helplines:* Police: **112** | Cyber Fraud: **1930** | Women Helpline: **181**`;
}

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

  useEffect(() => {
    localStorage.setItem('nyaya_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('nyaya_is_premium', isPremium);
  }, [isPremium]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const clearChatHistory = () => {
    setMessages([]);
    localStorage.removeItem('nyaya_chat_messages');
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Indian Accent TTS with Hindi Pronunciation for "Nyaya Mitra"
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();

      // Replace instances of 'Nyaya-Mitra' or 'Nyaya Mitra' with phonetic Hindi spelling so English TTS reads it as "Nyaay-Mitra"
      let formattedText = text.replace(/Nyaya[- ]Mitra/gi, 'Nyaay Mitra');
      formattedText = formattedText.replace(/[*#_•]/g, '');

      const utterance = new SpeechSynthesisUtterance(formattedText);
      const voices = window.speechSynthesis.getVoices();
      
      const indianVoice = voices.find(
        (v) => v.lang === 'en-IN' || v.lang.includes('en_IN') || v.name.includes('India')
      );

      if (indianVoice) {
        utterance.voice = indianVoice;
      }

      utterance.lang = 'en-IN';
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS Error:", e);
    }
  };

  // Speech Recognition set back to Indian English (en-IN)
  const handleMicClick = async () => {
    setStatusMessage('');
    stopSpeaking();

    if (isRecording) {
      if (recognitionInstanceRef.current) {
        try { recognitionInstanceRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setStatusMessage('⚠️ Mic access denied. Enable mic permissions in browser settings.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage('⚠️ Web Speech API not supported on this browser. Use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionInstanceRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English recognition

      recognition.onstart = () => {
        setIsRecording(true);
        setStatusMessage('🎙️ Listening... Speak now.');
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
        if (event.error === 'no-speech') {
          setStatusMessage('⚠️ No speech heard. Try again.');
        } else {
          setStatusMessage(`Mic Notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      setStatusMessage('⚠️ Could not start mic.');
      setIsRecording(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = (topicTitle = '', initialQuery = '') => {
    stopSpeaking();
    const welcomeMsg = topicTitle
      ? `Welcome. Let's review **${topicTitle}**. Share details of your case.`
      : "Hello, I am Nyaya-Mitra. How may I assist you with your legal rights today?";

    if (initialQuery) {
      const botResponse = getLegalResponse(initialQuery);
      setMessages([
        { id: Date.now(), sender: 'bot', text: welcomeMsg },
        { id: Date.now() + 1, sender: 'user', text: initialQuery },
        { id: Date.now() + 2, sender: 'bot', text: botResponse }
      ]);
      speakText(botResponse);
    } else if (messages.length === 0) {
      setMessages([{ id: Date.now(), sender: 'bot', text: welcomeMsg }]);
      speakText(welcomeMsg);
    }
    setCurrentView('chat');
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (isRecording && recognitionInstanceRef.current) {
      try { recognitionInstanceRef.current.stop(); } catch (e) {}
      setIsRecording(false);
    }
    stopSpeaking();

    const userText = input;
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setInput('');

    setTimeout(() => {
      const legalAnswer = getLegalResponse(userText);
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: legalAnswer }]);
      speakText(legalAnswer);
    }, 300);
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
      {/* Top Header */}
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
            <p style={{ fontSize: '11px', color: '#34d399', margin: 0 }}>Legal Rights Assistant</p>
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

      {/* VIEW 1: HOME VIEW */}
      {currentView === 'home' && (
        <main style={{ maxWidth: '850px', width: '100%', margin: '0 auto', padding: '36px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
          <span style={{ padding: '4px 14px', borderRadius: '9999px', backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#6ee7b7', fontSize: '12px', fontWeight: '600', marginBottom: '20px' }}>
            ✓ Verified Legal Information & Voice Assistant
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
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Click to launch interactive assistant.</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW 2: LEGAL DIRECTORY VIEW */}
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
                  <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', margin: '0 0 14px 0' }}>{item.response.slice(0, 120)}...</p>
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
            <button onClick={() => { stopSpeaking(); setCurrentView('home'); }} style={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#34d399', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
              ← Return Home
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearChatHistory} style={{ backgroundColor: '#1f1917', border: '1px solid #7f1d1d', color: '#f87171', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                🗑️ Clear History
              </button>
              <button onClick={() => isSpeaking ? stopSpeaking() : speakText(messages[messages.length - 1]?.text || '')} style={{ backgroundColor: isSpeaking ? 'rgba(52, 211, 153, 0.2)' : 'transparent', border: '1px solid #374151', color: isSpeaking ? '#34d399' : '#9ca3af', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                {isSpeaking ? '🔊 Speaking...' : '🔈 Read Aloud'}
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
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder={isRecording ? "Listening to your voice..." : "Type or speak your legal question..."} 
                style={{ flex: 1, padding: '12px 16px', borderRadius: '9999px', backgroundColor: '#111827', border: '1px solid #1f2937', color: '#ffffff', fontSize: '14px', outline: 'none' }} 
              />
              
              <button 
                onClick={handleSend} 
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
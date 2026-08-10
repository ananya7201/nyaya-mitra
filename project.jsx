import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Mic,
  Square,
  Send,
  Volume2,
  VolumeX,
  Scale,
  Shield,
  Home as HomeIcon,
  FileText,
} from "lucide-react";

/**
 * Nyaya-Mitra — /chat
 * -------------------------------------------------------------
 * Drop-in notes for your real app:
 *  - Swap the plain <button onClick={...}> "back" control for your
 *    react-router <Link to="/"> the way Home.jsx does.
 *  - Swap `category` state below for `useSearchParams()` to read
 *    ?category=police|tenant|filings the way Home.jsx links to it.
 *  - This file assumes your global theme already defines
 *    --background / --card / --primary / --border / --muted-foreground
 *    and a `font-heading` class, same as Home.jsx. The inline
 *    <style> block below only provides fallback values so this
 *    renders correctly in isolation (e.g. in a preview).
 * -------------------------------------------------------------
 */

const THEME_FALLBACK = `
  .nm-scope {
    --background: #FAF8F3;
    --card: #FFFFFF;
    --primary: #3B4A6B;
    --primary-hover: #465882;
    --primary-foreground: #FFFFFF;
    --border: #E7E2D7;
    --muted-foreground: #746E5F;
    --foreground: #2A281F;
    --seal: #A87F3F;
    --seal-tint: #A87F3F14;
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
  }
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500&display=swap');
  .nm-scope { font-family: 'IBM Plex Sans', ui-sans-serif, system-ui; }
  .nm-scope .font-heading { font-family: 'Fraunces', ui-serif, serif; }
  .nm-scope .font-mono-tag { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

  .nm-scope * { transition-timing-function: var(--ease); }

  .nm-glass { background: color-mix(in srgb, var(--background) 82%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }

  .nm-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .nm-scroll::-webkit-scrollbar-track { background: transparent; }
  .nm-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--muted-foreground) 30%, transparent); border-radius: 999px; }
  .nm-scroll { scrollbar-width: thin; }
  .nm-scroll-x::-webkit-scrollbar { display: none; }
  .nm-scroll-x { -ms-overflow-style: none; scrollbar-width: none; }

  .nm-chip-fade { -webkit-mask-image: linear-gradient(to right, transparent, black 16px, black calc(100% - 28px), transparent); mask-image: linear-gradient(to right, transparent, black 16px, black calc(100% - 28px), transparent); }

  @keyframes nm-fade-up { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .nm-msg { animation: nm-fade-up 0.45s var(--ease); }

  @keyframes nm-pulse-ring {
    0% { transform: scale(0.85); opacity: 0.5; }
    100% { transform: scale(1.7); opacity: 0; }
  }
  .nm-pulse::before, .nm-pulse::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: var(--seal);
    animation: nm-pulse-ring 1.7s var(--ease) infinite;
  }
  .nm-pulse::after { animation-delay: 0.55s; }

  @keyframes nm-dot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
  .nm-dot { animation: nm-dot 1.2s var(--ease) infinite; }

  .nm-btn { transition: transform 0.18s var(--ease), background-color 0.25s var(--ease), box-shadow 0.25s var(--ease), opacity 0.2s var(--ease); }
  .nm-btn:active:not(:disabled) { transform: scale(0.92); }
  .nm-chip { transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease), border-color 0.2s var(--ease); }
  .nm-chip:hover { transform: translateY(-1.5px); box-shadow: 0 4px 14px -6px rgba(42,40,31,0.18); }
  .nm-chip:active { transform: translateY(0) scale(0.97); }
  .nm-card-hover { transition: box-shadow 0.3s var(--ease), transform 0.3s var(--ease); }
  .nm-card-hover:hover { box-shadow: 0 10px 30px -12px rgba(42,40,31,0.16); }
  .nm-input { transition: box-shadow 0.2s var(--ease), border-color 0.2s var(--ease); }
  .nm-input:focus { box-shadow: 0 0 0 3.5px color-mix(in srgb, var(--primary) 16%, transparent); border-color: var(--primary); }
`;

// ---------------------------------------------------------------
// Knowledge base — small, curated, cited. Not open-ended legal Q&A.
// ---------------------------------------------------------------
const KB = [
  {
    id: "fir",
    category: "police",
    keywords: ["fir", "refuse", "refusing", "register", "complaint", "police station", "report"],
    spoken:
      "If an officer refuses to register your FIR for a cognizable offence, that refusal is not lawful. Here's what you can do.",
    title: "Your Right to File an FIR",
    sectionTag: "BNSS §173(1)",
    bullets: [
      "Police must register an FIR for any cognizable offence — refusal is not lawful",
      "You can file a Zero FIR at any police station, regardless of jurisdiction",
      "If refused, send your complaint in writing to the Superintendent of Police",
      "You may also approach a Magistrate directly under BNSS §175(3)",
    ],
    actionNote: "Ask the officer to state their reason for refusing in writing.",
  },
  {
    id: "arrest",
    category: "police",
    keywords: ["arrest", "arrested", "detain", "detained", "custody", "took me", "lockup"],
    spoken:
      "If you or someone you know is arrested, a few protections apply immediately, not later.",
    title: "Your Rights If Arrested",
    sectionTag: "Art. 22 · BNSS §47–58",
    bullets: [
      "You must be told the grounds of arrest immediately",
      "You have the right to inform a friend or relative of the arrest",
      "You must be produced before a Magistrate within 24 hours",
      "You have the right to consult a lawyer of your choice",
    ],
    actionNote: "Ask to see the arrest memo — it must be signed by an independent witness.",
  },
  {
    id: "eviction",
    category: "tenant",
    keywords: ["landlord", "evict", "eviction", "lockout", "locked", "throw", "vacate"],
    spoken:
      "A landlord cannot forcibly evict you or change the locks without going through the courts.",
    title: "Protection from Illegal Eviction",
    sectionTag: "State Rent Control Act",
    bullets: [
      "Forcible eviction or lockout without a court order is not lawful",
      "Eviction generally requires written notice and due legal process",
      "Deposit and notice-period rules vary by state — ask for everything in writing",
    ],
    actionNote: "If you've been locked out, this may count as illegal eviction — you can file a police complaint.",
  },
  {
    id: "rent",
    category: "tenant",
    keywords: ["rent", "deposit", "receipt", "landlord raising", "increase"],
    spoken: "Rent and deposit disputes are common, and you have more paper-trail protection than you'd think.",
    title: "Rent & Deposit Protections",
    sectionTag: "State Rent Control Act",
    bullets: [
      "Always insist on a written rent receipt, even for cash payments",
      "Security deposit limits and refund timelines are set by state law",
      "A landlord cannot cut water or electricity to force you out",
    ],
    actionNote: "Keep every receipt and message — they're your evidence if this goes to the Rent Controller.",
  },
  {
    id: "rti",
    category: "filings",
    keywords: ["rti", "information", "public authority", "application"],
    spoken: "An RTI is one of the simplest, most powerful filings available to any citizen.",
    title: "Filing an RTI Application",
    sectionTag: "RTI Act, 2005",
    bullets: [
      "File with any public authority for a small fee (often ₹10)",
      "The authority must respond within 30 days",
      "BPL applicants are exempt from the fee",
    ],
    actionNote: "No reply in 30 days? You can file a first appeal with the same department.",
  },
  {
    id: "consumer",
    category: "filings",
    keywords: ["consumer", "refund", "defective", "product", "service complaint"],
    spoken: "Consumer complaints have a dedicated, fairly fast redress system — you don't need a lawyer to start.",
    title: "Filing a Consumer Complaint",
    sectionTag: "Consumer Protection Act, 2019",
    bullets: [
      "File online via the National Consumer Helpline or e-Daakhil portal",
      "Claims under ₹50 lakh go to the District Commission",
      "Keep the bill, warranty card, and all written correspondence",
    ],
    actionNote: "Call 1915 (National Consumer Helpline) for free initial guidance.",
  },
  {
    id: "salary",
    category: "workplace",
    keywords: ["salary", "employer", "unpaid", "withheld", "wages", "not paying", "fired", "termination"],
    spoken: "Withholding your salary without a lawful reason isn't something an employer can just do — you have a direct legal route here.",
    title: "Unpaid or Withheld Wages",
    sectionTag: "Payment of Wages Act, 1936 §5–7",
    bullets: [
      "Wages must be paid by the 7th or 10th of the following month, depending on establishment size",
      "Deductions are allowed only for specific, listed reasons — not arbitrarily",
      "You can file a claim before the labour authority within 12 months of the default",
    ],
    actionNote: "Keep your offer letter, payslips, and any written termination notice — you'll need them for the claim.",
  },
  {
    id: "cheque",
    category: "filings",
    keywords: ["cheque bounce", "cheque bounced", "bounced cheque", "dishonoured", "dishonored", "cheque return"],
    spoken: "A bounced cheque isn't just a banking issue — it's a criminal offence you can act on directly.",
    title: "Cheque Bounce Complaint",
    sectionTag: "Negotiable Instruments Act, 1881 §138",
    bullets: [
      "Send a legal notice to the drawer within 30 days of the bounce memo",
      "They have 15 days to pay after receiving the notice",
      "If unpaid, you can file a criminal complaint within 30 days after that",
    ],
    actionNote: "Keep the bounced cheque, the bank's return memo, and proof of the notice being sent.",
  },
  {
    id: "domestic",
    category: "safety",
    keywords: ["domestic violence", "husband hit", "abuse at home", "in-laws", "harassment at home"],
    spoken: "You have specific, fast legal protection for this — it doesn't require a lengthy criminal trial to get relief.",
    title: "Protection from Domestic Violence",
    sectionTag: "Protection of Women from Domestic Violence Act, 2005",
    bullets: [
      "You can seek a protection order, residence order, or monetary relief — separately from any criminal case",
      "A Protection Officer or registered NGO can help you file, free of cost",
      "You have the right to continue residing in the shared household",
    ],
    actionNote: "The Women Helpline (181) can connect you to a Protection Officer near you, any time of day.",
  },
  {
    id: "cyber",
    category: "filings",
    keywords: ["online fraud", "cyber", "hacked", "otp scam", "upi fraud", "phishing"],
    spoken: "Online fraud has its own fast-track reporting system, and speed matters for actually recovering the money.",
    title: "Reporting Cyber Fraud",
    sectionTag: "Information Technology Act, 2000 §66",
    bullets: [
      "Report immediately at cybercrime.gov.in or call the 1930 helpline",
      "The 'golden hour' (first few hours) matters most for freezing a fraudulent transaction",
      "Save screenshots, transaction IDs, and any messages from the scammer",
    ],
    actionNote: "Call 1930 first, before filing online — they can flag the transaction faster.",
  },
];

const CHIPS = [
  { label: "FIR refused", scenarioId: "fir", icon: Shield },
  { label: "I was arrested", scenarioId: "arrest", icon: Shield },
  { label: "Locked out by landlord", scenarioId: "eviction", icon: HomeIcon },
  { label: "Filing an RTI", scenarioId: "rti", icon: FileText },
];

function matchScenario(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const item of KB) {
    const score = item.keywords.reduce((acc, kw) => (lower.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

// ---------------------------------------------------------------
// Open-ended fallback — anything the curated KB above doesn't cover
// gets routed to Claude directly, in the same calm, cited voice.
//
// NOTE: this raw fetch to api.anthropic.com works ONLY inside this
// Claude preview (the key is injected for you here). In your real
// deployed app, move this call to your own backend endpoint that
// holds the API key server-side — never ship a key to the browser.
// ---------------------------------------------------------------
const NYAYA_MITRA_SYSTEM_PROMPT = `You are Nyaya-Mitra, a calm, plain-spoken voice guide to basic legal rights for people in India — police procedures, tenant rights, workplace issues, consumer and financial disputes, safety, and common filings (FIR, RTI, cyber fraud, cheque bounce, etc).

Rules:
- General information only. Never give case-specific legal advice or predict an outcome.
- CITE THE LAW, ALWAYS, when the question is even loosely about a legal right or procedure in India: name the specific Act and section number (e.g. "BNSS §173(1)"), the Constitution article, or — when it genuinely varies by state (like tenancy) — say "State-specific: <name of Act category>". This applies even to short answers; sectionTag should almost never be null for a law-related question. Only leave it null for questions with no legal-rights angle at all (small talk, unrelated topics).
- If you are not confident of the exact section number, say so in "spoken" rather than inventing one, and set sectionTag to a general but honest reference (e.g. "Indian Penal Code / BNS — exact section unconfirmed, verify with a lawyer").
- DO NOT reuse the same response shape for every scenario. A police-procedure question, a tenancy question, a workplace question, and a consumer question involve different laws, different urgency, and different next steps — write each answer specific to that domain, not a generic template with the topic swapped in.
- Keep "spoken" short and calm — 2 to 4 sentences, natural to read aloud, no legalese.
- If the question is outside legal rights entirely, answer briefly and naturally, then gently note this app's focus is legal rights.
- If the situation sounds urgent or unsafe, prioritize telling them to contact emergency services (112) or the NALSA legal aid helpline (15100).

Respond with ONLY raw JSON, no markdown fences, no preamble, exactly this shape:
{"spoken": string, "title": string|null, "sectionTag": string|null, "bullets": string[]|null, "actionNote": string|null}

Fill title + bullets only when you have enough concrete, citable detail for a short reference list (2-4 bullets). If you only have a one-line answer, still set sectionTag when it's law-related, but leave title/bullets/actionNote null — the citation will show as a small tag rather than a full card.`;

async function askNyayaMitra(userText, priorMessages) {
  const history = priorMessages
    .filter((m) => !m.loadingId)
    .slice(-8)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: NYAYA_MITRA_SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: userText }],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  const raw = textBlock ? textBlock.text : "";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { spoken: raw || "Could you rephrase that? I didn't quite catch it.", title: null };
  }

  const card =
    parsed.title && parsed.bullets && parsed.bullets.length
      ? {
          id: `ai-${Date.now()}`,
          title: parsed.title,
          sectionTag: parsed.sectionTag || "General guidance — verify with a lawyer",
          bullets: parsed.bullets,
          actionNote: parsed.actionNote || null,
        }
      : null;

  return {
    spoken: parsed.spoken || "Here's what I found.",
    card,
    sectionTag: !card ? parsed.sectionTag || null : null,
  };
}

function ReadAlongCard({ scenario }) {
  return (
    <div
      className="nm-msg nm-card-hover mt-3 rounded-[20px] border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--card)", boxShadow: "0 2px 12px -8px rgba(42,40,31,0.12)" }}
    >
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, var(--seal), color-mix(in srgb, var(--seal) 40%, transparent))" }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "var(--seal-tint)", color: "var(--seal)" }}
            >
              §
            </span>
            <h4 className="font-heading text-[15px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
              {scenario.title}
            </h4>
          </div>
          <span
            className="font-mono-tag shrink-0 rounded-md px-2 py-1 text-[10px] tracking-wide"
            style={{ background: "var(--seal-tint)", color: "var(--seal)" }}
          >
            {scenario.sectionTag}
          </span>
        </div>
        <ul className="mt-3.5 space-y-2">
          {scenario.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }}>
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--muted-foreground)" }} />
              {b}
            </li>
          ))}
        </ul>
        {scenario.actionNote && (
          <div
            className="mt-4 rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed"
            style={{ background: "var(--seal-tint)", color: "var(--foreground)" }}
          >
            <strong style={{ color: "var(--seal)" }}>In the moment: </strong>
            {scenario.actionNote}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "I'm Nyaya-Mitra. Tell me what's happening — in your own words — and I'll walk you through your rights.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join("");
        setInput(transcript);
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const speakText = (text) => {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(
    (voice) => voice.lang === 'en-IN' || voice.lang.includes('en_IN')
  );

  if (indianVoice) {
    utterance.voice = indianVoice;
  }

  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
};
  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const historySnapshot = messages;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    const scenario = matchScenario(trimmed);
    if (scenario) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "agent", text: scenario.spoken, scenario }]);
        speak(scenario.spoken);
      }, 450);
      return;
    }

    // No curated match — ask Claude directly, same voice, same card format.
    const loadingId = Date.now();
    setMessages((prev) => [...prev, { role: "agent", loadingId }]);

    try {
      const reply = await askNyayaMitra(trimmed, historySnapshot);
      setMessages((prev) => [
        ...prev.filter((m) => m.loadingId !== loadingId),
        { role: "agent", text: reply.spoken, scenario: reply.card, sectionTag: reply.sectionTag },
      ]);
      speak(reply.spoken);
    } catch (err) {
      const fallback =
        "I'm having trouble reaching my knowledge base right now. For anything urgent, please call the NALSA helpline at 15100.";
      setMessages((prev) => [
        ...prev.filter((m) => m.loadingId !== loadingId),
        { role: "agent", text: fallback },
      ]);
    }
  };

  const toggleMic = () => {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      if (input.trim()) sendMessage(input);
    } else {
      setInput("");
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const handleChip = (scenarioId) => {
    const scenario = KB.find((s) => s.id === scenarioId);
    if (scenario) sendMessage(CHIPS.find((c) => c.scenarioId === scenarioId)?.label || scenario.title);
  };

  return (
    <div className="nm-scope min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <style>{THEME_FALLBACK}</style>

      {/* Header */}
      <header
        className="nm-glass sticky top-0 z-10 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="nm-btn flex items-center gap-1.5 text-sm font-medium rounded-full px-2.5 py-1.5 -ml-2.5 hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-xl"
              style={{ background: "var(--primary)", boxShadow: "0 3px 10px -4px rgba(59,74,107,0.5)" }}
            >
              <Scale className="h-3.5 w-3.5" style={{ color: "var(--primary-foreground)" }} strokeWidth={1.8} />
            </span>
            <div className="text-center">
              <p className="font-heading text-sm font-semibold leading-none" style={{ color: "var(--foreground)" }}>
                Nyaya-Mitra
              </p>
              <p className="text-[10px] mt-1 flex items-center justify-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: listening ? "var(--seal)" : "#7A9B7E", transition: "background-color 0.3s var(--ease)" }}
                />
                {listening ? "Listening…" : "Ready"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className="nm-btn rounded-full p-2 hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Toggle spoken responses"
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>

        {/* Starter chips */}
        <div className="nm-chip-fade nm-scroll-x max-w-2xl mx-auto px-4 sm:px-6 pb-3.5 flex gap-2 overflow-x-auto">
          {CHIPS.map((chip) => (
            <button
              key={chip.scenarioId}
              onClick={() => handleChip(chip.scenarioId)}
              className="nm-chip shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
            >
              <chip.icon className="h-3 w-3" style={{ color: "var(--seal)" }} />
              {chip.label}
            </button>
          ))}
        </div>
      </header>

      {/* Conversation */}
      <main ref={scrollRef} className="nm-scroll flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className="nm-msg">
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-[18px] px-4 py-2.5 text-[13.5px] leading-relaxed"
                  style={
                    m.role === "user"
                      ? {
                          background: "var(--primary)",
                          color: "var(--primary-foreground)",
                          borderBottomRightRadius: "6px",
                          boxShadow: "0 3px 12px -6px rgba(59,74,107,0.45)",
                        }
                      : {
                          background: "var(--card)",
                          color: "var(--foreground)",
                          border: "1px solid var(--border)",
                          borderBottomLeftRadius: "6px",
                          boxShadow: "0 2px 8px -6px rgba(42,40,31,0.1)",
                        }
                  }
                >
                  {m.loadingId ? (
                    <span className="flex items-center gap-1 py-0.5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="nm-dot h-1.5 w-1.5 rounded-full"
                          style={{ background: "var(--muted-foreground)", animationDelay: `${d * 0.15}s` }}
                        />
                      ))}
                    </span>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
              {m.scenario && <ReadAlongCard scenario={m.scenario} />}
              {!m.scenario && m.sectionTag && (
                <div
                  className="nm-msg font-mono-tag mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] tracking-wide"
                  style={{ background: "var(--seal-tint)", color: "var(--seal)" }}
                >
                  <span>§</span>
                  {m.sectionTag}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Disclaimer */}
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6">
        <p className="text-[10.5px] text-center py-1.5" style={{ color: "var(--muted-foreground)" }}>
          General legal information, not legal advice. Urgent help: NALSA helpline 15100.
        </p>
      </div>

      {/* Composer */}
      <div className="nm-glass border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-2.5">
          <button
            onClick={toggleMic}
            disabled={!speechSupported}
            className="nm-btn relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
            style={{
              background: listening ? "var(--seal)" : "var(--primary)",
              boxShadow: listening ? "0 4px 16px -6px rgba(168,127,63,0.55)" : "0 4px 16px -6px rgba(59,74,107,0.5)",
            }}
            aria-label={listening ? "Stop listening" : "Start speaking"}
          >
            {listening && <span className="nm-pulse absolute inset-0" />}
            {listening ? (
              <Square className="h-4 w-4 relative" fill="white" style={{ color: "white" }} />
            ) : (
              <Mic className="h-4.5 w-4.5 relative" style={{ color: "var(--primary-foreground)" }} />
            )}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder={speechSupported ? "Type, or tap the mic to speak…" : "Type what's happening…"}
            className="nm-input flex-1 rounded-full border px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
          />

          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="nm-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: "var(--primary)", boxShadow: "0 4px 16px -6px rgba(59,74,107,0.5)" }}
            aria-label="Send"
          >
            <Send className="h-4 w-4" style={{ color: "var(--primary-foreground)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
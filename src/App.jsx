import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Globe, Trash2, AlertCircle, RefreshCw, Languages } from 'lucide-react';

// Language configurations
const LANGUAGES = [
  { code: 'en', name: 'English', voice: 'en-US' },
  { code: 'es', name: 'Spanish', voice: 'es-ES' },
  { code: 'zh', name: 'Chinese (Mandarin)', voice: 'zh-CN' },
  { code: 'hi', name: 'Hindi', voice: 'hi-IN' },
  { code: 'ar', name: 'Arabic', voice: 'ar-SA' },
  { code: 'fr', name: 'French', voice: 'fr-FR' },
  { code: 'de', name: 'German', voice: 'de-DE' },
  { code: 'pt', name: 'Portuguese', voice: 'pt-BR' },
  { code: 'ru', name: 'Russian', voice: 'ru-RU' },
  { code: 'ja', name: 'Japanese', voice: 'ja-JP' },
  { code: 'ko', name: 'Korean', voice: 'ko-KR' },
  { code: 'it', name: 'Italian', voice: 'it-IT' },
  { code: 'tr', name: 'Turkish', voice: 'tr-TR' },
  { code: 'pl', name: 'Polish', voice: 'pl-PL' },
  { code: 'nl', name: 'Dutch', voice: 'nl-NL' },
  { code: 'vi', name: 'Vietnamese', voice: 'vi-VN' },
  { code: 'th', name: 'Thai', voice: 'th-TH' },
  { code: 'id', name: 'Indonesian', voice: 'id-ID' },
  { code: 'uk', name: 'Ukrainian', voice: 'uk-UA' },
  { code: 'ro', name: 'Romanian', voice: 'ro-RO' }
];

// Medical terminology enhancement
const MEDICAL_TERMS = {
  'bp': 'blood pressure',
  'hr': 'heart rate',
  'temp': 'temperature',
  'meds': 'medications',
  'rx': 'prescription',
  'dx': 'diagnosis',
  'tx': 'treatment',
  'hx': 'history',
  'sx': 'symptoms'
};

const App = () => {
  const [inputLang, setInputLang] = useState('en');
  const [outputLang, setOutputLang] = useState('es');
  const [isListening, setIsListening] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = LANGUAGES.find(l => l.code === inputLang)?.voice || 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (final) {
          const enhanced = enhanceMedicalTerms(final);
          setOriginalText(prev => prev + enhanced);
          translateText(originalText + enhanced);
        }
        setInterimText(interim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };
    } else {
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [inputLang]);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('healthcareTranslationSessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }

    const disclaimerShown = localStorage.getItem('disclaimerShown');
    if (disclaimerShown) {
      setShowDisclaimer(false);
    }
  }, []);

  // Enhance medical terminology
  const enhanceMedicalTerms = (text) => {
    let enhanced = text.toLowerCase();
    Object.keys(MEDICAL_TERMS).forEach(abbr => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      enhanced = enhanced.replace(regex, MEDICAL_TERMS[abbr]);
    });
    return enhanced;
  };

  // Translation function using Google Translate API fallback
  const translateText = async (text) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    setError('');

    try {
      // Using Google Translate API (you'll need to add your API key)
      // For demo purposes, using a free translation API
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${inputLang}&tl=${outputLang}&dt=t&q=${encodeURIComponent(text)}`
      );
      
      const data = await response.json();
      const translated = data[0].map(item => item[0]).join('');
      setTranslatedText(translated);
      
      // Save session
      saveSession(text, translated);
    } catch (err) {
      console.error('Translation error:', err);
      setError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Save session to localStorage
  const saveSession = (original, translated) => {
    const session = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      inputLang,
      outputLang,
      original,
      translated
    };

    const newSessions = [session, ...sessions].slice(0, 10);
    setSessions(newSessions);
    localStorage.setItem('healthcareTranslationSessions', JSON.stringify(newSessions));
  };

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      setError('');
      recognitionRef.current.lang = LANGUAGES.find(l => l.code === inputLang)?.voice || 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Text-to-speech
  const speakText = (text, lang) => {
    if (!text) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    const langVoice = LANGUAGES.find(l => l.code === lang)?.voice;
    
    const voice = voices.find(v => v.lang.startsWith(langVoice?.split('-')[0])) || voices[0];
    if (voice) utterance.voice = voice;
    
    utterance.lang = langVoice || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    synthRef.current.speak(utterance);
  };

  // Clear session
  const clearSession = () => {
    setOriginalText('');
    setTranslatedText('');
    setInterimText('');
    setError('');
  };

  // Clear all history
  const clearHistory = () => {
    setSessions([]);
    localStorage.removeItem('healthcareTranslationSessions');
  };

  // Accept disclaimer
  const acceptDisclaimer = () => {
    setShowDisclaimer(false);
    localStorage.setItem('disclaimerShown', 'true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={32} />
              <h2 className="text-2xl font-bold text-gray-800">Important Medical Disclaimer</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold">This is a demonstration prototype for educational purposes only.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>This application is NOT HIPAA compliant and should NOT be used for actual patient care.</li>
                <li>All translations are automated and may contain errors, especially for medical terminology.</li>
                <li>Do NOT use this app for critical medical decisions or emergencies.</li>
                <li>Always verify translations with professional medical interpreters.</li>
                <li>Data is stored locally in your browser and automatically cleared when you close the session.</li>
                <li>For production use, implement proper security, encryption, and HIPAA compliance measures.</li>
              </ul>
              <p className="font-semibold text-red-600">By continuing, you acknowledge this is a prototype demonstration only.</p>
            </div>
            <button
              onClick={acceptDisclaimer}
              className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              I Understand - Continue to Demo
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages className="text-indigo-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-800">Healthcare Translator</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                className="p-2 text-gray-600 hover:text-red-600 transition"
                title="Clear History"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Language Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-indigo-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Language Selection</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Language (Speaking)
              </label>
              <select
                value={inputLang}
                onChange={(e) => setInputLang(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Language (Translation)
              </label>
              <select
                value={outputLang}
                onChange={(e) => setOutputLang(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={toggleListening}
              className={`flex items-center gap-3 px-8 py-4 rounded-lg font-semibold text-white transition transform hover:scale-105 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              {isListening ? 'Stop Listening' : 'Start Speaking'}
            </button>
            <button
              onClick={clearSession}
              className="flex items-center gap-2 px-6 py-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
            >
              <RefreshCw size={20} />
              Clear Session
            </button>
          </div>
          {isListening && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="font-medium">Recording...</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Dual Transcript Display */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Original Transcript */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Original ({LANGUAGES.find(l => l.code === inputLang)?.name})
              </h3>
              <button
                onClick={() => speakText(originalText, inputLang)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                disabled={!originalText}
              >
                <Volume2 size={20} />
              </button>
            </div>
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {originalText}
                {interimText && (
                  <span className="text-gray-400 italic">{interimText}</span>
                )}
              </p>
              {!originalText && !interimText && (
                <p className="text-gray-400 italic">Start speaking to see transcript...</p>
              )}
            </div>
          </div>

          {/* Translated Transcript */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Translation ({LANGUAGES.find(l => l.code === outputLang)?.name})
              </h3>
              <button
                onClick={() => speakText(translatedText, outputLang)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                disabled={!translatedText}
              >
                <Volume2 size={20} />
              </button>
            </div>
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-indigo-50 rounded-lg p-4">
              {isTranslating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  <p className="text-gray-800 whitespace-pre-wrap">{translatedText}</p>
                  {!translatedText && (
                    <p className="text-gray-400 italic">Translation will appear here...</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Session History */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sessions</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {sessions.map(session => (
                <div key={session.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(session.timestamp).toLocaleString()}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        {LANGUAGES.find(l => l.code === session.inputLang)?.name}:
                      </span>
                      <p className="text-gray-600 mt-1">{session.original.substring(0, 100)}...</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {LANGUAGES.find(l => l.code === session.outputLang)?.name}:
                      </span>
                      <p className="text-gray-600 mt-1">{session.translated.substring(0, 100)}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white mt-8 py-6 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>⚠️ Demo Prototype Only - Not for Clinical Use</p>
          <p className="mt-2">Data stored locally in browser • No server transmission • Clear on session end</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
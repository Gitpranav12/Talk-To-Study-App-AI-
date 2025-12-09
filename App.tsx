import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, UploadIcon, MicIcon, SendIcon, AlertIcon, SunIcon, MoonIcon } from './components/Icons';
import { ResultPanel } from './components/ResultPanel';
import { analyzeImageContent, askFollowUpQuestion } from './services/geminiService';
import { AppLanguage, LearningContent, ChatMessage } from './types';

// Language Configuration Map
const LANGUAGE_CONFIG: Record<AppLanguage, { code: string, voiceCode: string }> = {
  [AppLanguage.ENGLISH]: { code: 'en-US', voiceCode: 'en-US' },
  [AppLanguage.HINDI]: { code: 'hi-IN', voiceCode: 'hi-IN' },
  [AppLanguage.SPANISH]: { code: 'es-ES', voiceCode: 'es-ES' },
  [AppLanguage.FRENCH]: { code: 'fr-FR', voiceCode: 'fr-FR' },
  [AppLanguage.GERMAN]: { code: 'de-DE', voiceCode: 'de-DE' },
  [AppLanguage.CHINESE]: { code: 'zh-CN', voiceCode: 'zh-CN' },
  [AppLanguage.JAPANESE]: { code: 'ja-JP', voiceCode: 'ja-JP' },
  [AppLanguage.ARABIC]: { code: 'ar-SA', voiceCode: 'ar-SA' },
  [AppLanguage.PORTUGUESE]: { code: 'pt-BR', voiceCode: 'pt-BR' },
  [AppLanguage.RUSSIAN]: { code: 'ru-RU', voiceCode: 'ru-RU' },
};

type Theme = 'dark' | 'light';

const App = () => {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<LearningContent | null>(null);
  const [language, setLanguage] = useState<AppLanguage>(AppLanguage.ENGLISH);
  const [theme, setTheme] = useState<Theme>('dark');
  
  // Audio Player State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speechVolume, setSpeechVolume] = useState(1);
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Theme Effect
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Handle Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = LANGUAGE_CONFIG[language].code;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        handleSendMessage(transcript); // Auto send on voice
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      
      recognitionRef.current = recognition;
    }
  }, [language]); // Re-init if language changes

  // Helper: File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix for Gemini API
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation
      if (!file.type.startsWith('image/')) {
        setError("Unsupported file format. Please upload a valid image (JPEG, PNG).");
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("Image is too large. Please use an image under 10MB.");
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        setImage(base64);
        setContent(null); // Reset content on new image
      } catch (err) {
        setError("Failed to process image file.");
      }
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    stopSpeaking(); // Stop any current speech
    
    try {
      const result = await analyzeImageContent(image, language);
      setContent(result);
      setMessages([]); // Clear previous chat
    } catch (error) {
      console.error(error);
      setError("Unable to analyze the image. Please ensure the image is clear and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Text to Speech Logic
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeechProgress(0);
    currentUtteranceRef.current = null;
  };

  const togglePause = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const speakContent = (text: string, forceLang?: string) => {
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance;
    
    utterance.lang = forceLang || LANGUAGE_CONFIG[language].voiceCode;
    utterance.rate = 0.9;
    utterance.volume = speechVolume;
    
    // Progress tracking approx based on char boundaries
    const totalLength = text.length;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const percent = (event.charIndex / totalLength) * 100;
        setSpeechProgress(Math.min(percent, 100));
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechProgress(100);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleReadAloud = () => {
    if (!content) return;
    const textToRead = `
      Topic: ${content.topic}. 
      Simple Explanation: ${content.simple_explanation}. 
      Key Points: ${content.key_points.join('. ')}. 
      Example: ${content.example}.
    `;
    speakContent(textToRead);
  };

  // Volume Change
  useEffect(() => {
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.volume = speechVolume;
    }
  }, [speechVolume]);

  // Chat/Voice Logic
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || chatInput;
    if (!text.trim() || !content) return;

    // Add User Message
    const userMsg: ChatMessage = { role: 'user', text };
    
    // Optimistically update UI
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    // Build context from analysis
    const context = `
      Topic: ${content.topic}
      Extracted Text: ${content.short_reading}
      Explanation: ${content.simple_explanation}
      Key Points: ${content.key_points.join('\n')}
      Example: ${content.example}
    `;

    const currentHistory = [...messages, userMsg];

    // Get AI Response
    const responseText = await askFollowUpQuestion(context, currentHistory, language);
    
    const aiMsg: ChatMessage = { role: 'assistant', text: responseText };
    setMessages(prev => [...prev, aiMsg]);
    setChatLoading(false);

    // Auto-speak the answer
    speakContent(responseText);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-access-bg overflow-hidden transition-colors">
      
      {/* LEFT PANEL: Controls & Image */}
      <div className="w-full md:w-1/3 md:border-r border-access-border flex flex-col h-[40vh] md:h-full bg-access-card relative z-20 shadow-xl transition-colors">
        
        {/* Top Bar */}
        <div className="p-6 border-b border-access-border flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-access-text mb-1 tracking-tight">
              Talk<span className="text-access-accent">To</span>Study
            </h1>
            <p className="text-access-textSec text-sm font-medium">Voice-First Learning Assistant</p>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-3 bg-access-bg rounded-full text-access-text hover:text-access-accent transition-colors border border-access-border"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
        </div>

        {/* Image Preview Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group">
          {image ? (
            <>
              <img 
                src={`data:image/jpeg;base64,${image}`} 
                alt="Uploaded content" 
                className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <button 
                onClick={() => { setImage(null); setError(null); }}
                className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                title="Remove image"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                <CameraIcon className="w-10 h-10" />
              </div>
              <p className="text-gray-400">No image selected</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 space-y-4 bg-access-card border-t border-access-border transition-colors">
          
          {/* Error Banner */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-100 p-3 rounded-xl flex items-start gap-3 animate-fade-in-up">
              <AlertIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* File Input */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />

          <div className="flex gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-access-border/50 hover:bg-access-border text-access-text py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border-2 border-transparent focus:border-access-accent outline-none"
            >
              <CameraIcon className="w-6 h-6" />
              <span className="font-semibold">Capture / Upload</span>
            </button>
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="block text-xs text-access-textSec mb-1 uppercase tracking-wider">Language</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                className="w-full bg-access-bg text-access-text p-3 rounded-lg border border-access-border focus:border-access-accent outline-none text-lg appearance-none cursor-pointer"
              >
                {Object.values(AppLanguage).map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={!image || loading}
            className={`w-full py-5 rounded-xl text-xl font-bold uppercase tracking-wide transition-all
              ${!image 
                ? 'bg-access-border text-access-textSec cursor-not-allowed' 
                : loading 
                  ? 'bg-access-accent/50 text-black cursor-wait' 
                  : 'bg-access-accent hover:bg-access-accentHover text-black shadow-lg transform active:scale-98'
              }`}
          >
            {loading ? 'Analyzing...' : 'Explain This'}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Results & Chat */}
      <div className="w-full md:w-2/3 h-[60vh] md:h-full flex flex-col relative bg-access-bg transition-colors">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <ResultPanel 
            content={content} 
            isSpeaking={isSpeaking}
            onReadAloud={handleReadAloud}
            onStopSpeaking={stopSpeaking}
            speechProgress={speechProgress}
            isPaused={isPaused}
            togglePause={togglePause}
            volume={speechVolume}
            setVolume={setSpeechVolume}
          />
          
          {/* Chat History Section */}
          {content && (
            <div className="border-t border-access-border pt-8 mt-8 pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-access-textSec font-bold uppercase text-sm tracking-wider">Conversation History</h3>
                {messages.length > 0 && (
                  <button 
                    onClick={() => setMessages([])}
                    className="text-xs text-access-textSec hover:text-red-400 uppercase tracking-wide transition-colors"
                  >
                    Clear Chat
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center p-6 border-2 border-dashed border-access-border rounded-xl animate-fade-in-up">
                    <p className="text-access-textSec italic text-lg">Ask a question to start the conversation...</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-lg shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-access-card text-access-text rounded-tr-none border border-access-border' 
                        : 'bg-access-accent text-black rounded-tl-none font-medium'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="flex justify-start animate-fade-in-up">
                    <div className="bg-access-card text-access-textSec p-4 rounded-2xl rounded-tl-none border border-access-border flex items-center gap-1.5 h-[52px]">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Chat Input Area */}
        {content && (
          <div className="bg-access-card border-t border-access-border p-4 sticky bottom-0 z-30 pb-8 transition-colors">
            <div className="flex gap-2 max-w-4xl mx-auto items-end">
              <button 
                onClick={toggleListening}
                className={`p-4 rounded-full transition-all flex-shrink-0 ${
                  isListening ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-access-border text-access-text hover:bg-access-border/80'
                }`}
                title="Voice Input"
              >
                <MicIcon className="w-6 h-6" />
              </button>
              
              <div className="flex-1 bg-access-bg rounded-2xl border border-access-border focus-within:border-access-accent flex items-center p-2 transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={language === AppLanguage.HINDI ? "प्रश्न पूछें..." : "Ask a question about this page..."}
                  className="bg-transparent w-full text-access-text text-lg p-2 outline-none placeholder-access-textSec"
                />
              </div>

              <button 
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || chatLoading}
                className="p-4 bg-access-accent text-black rounded-full hover:bg-access-accentHover disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all transform active:scale-95 flex-shrink-0"
                title="Send Message"
              >
                <SendIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default App;
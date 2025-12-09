import React from 'react';
import { LearningContent } from '../types';
import { PlayIcon, StopIcon, PauseIcon, VolumeIcon } from './Icons';

interface ResultPanelProps {
  content: LearningContent | null;
  isSpeaking: boolean;
  onReadAloud: () => void;
  onStopSpeaking: () => void;
  speechProgress: number;
  isPaused: boolean;
  togglePause: () => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ 
  content, 
  isSpeaking, 
  onReadAloud, 
  onStopSpeaking,
  speechProgress,
  isPaused,
  togglePause,
  volume,
  setVolume
}) => {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-access-textSec p-8 text-center">
        <p className="text-xl mb-4">No content loaded yet.</p>
        <p>Upload an image and click Explain to start learning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 md:pb-8">
      {/* Header & Title */}
      <div className="border-b border-access-border pb-4">
        <h2 className="text-sm uppercase tracking-wider text-access-accent mb-1">Topic</h2>
        <h1 className="text-4xl font-bold text-access-text">{content.topic}</h1>
      </div>

      {/* Action Button - Sticky on Mobile */}
      <div className="sticky top-0 bg-access-card/95 backdrop-blur-sm p-4 -mx-4 border-b border-access-border md:static md:bg-transparent md:p-0 md:border-none md:mx-0 z-10 transition-colors">
        <div className="flex justify-end">
          {isSpeaking ? (
            <div className="flex flex-col w-full md:w-auto gap-3 animate-fade-in-up">
              <div className="flex gap-2 w-full">
                <button 
                  onClick={togglePause}
                  className="flex-1 flex items-center gap-2 bg-access-border/50 hover:bg-access-border text-access-text px-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 justify-center border border-access-border"
                >
                  {isPaused ? <PlayIcon className="w-6 h-6" /> : <PauseIcon className="w-6 h-6" />}
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </button>
                <button 
                  onClick={onStopSpeaking}
                  className="flex-1 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 justify-center"
                >
                  <StopIcon className="w-6 h-6" />
                  <span>Stop</span>
                </button>
              </div>
              
              <div className="bg-access-bg p-3 rounded-xl flex flex-col gap-2 border border-access-border">
                 {/* Progress Bar */}
                 <div className="w-full bg-access-border rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-access-accent h-full transition-all duration-300 ease-linear"
                        style={{ width: `${speechProgress}%` }}
                    />
                 </div>
                 
                 {/* Volume Slider */}
                 <div className="flex items-center gap-3 px-1">
                    <VolumeIcon className="w-4 h-4 text-access-textSec" />
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={volume} 
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-access-border rounded-lg appearance-none cursor-pointer accent-access-accent"
                    />
                 </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={onReadAloud}
              className="flex items-center gap-3 bg-access-accent hover:bg-access-accentHover text-black px-8 py-4 rounded-xl font-bold text-xl shadow-lg transition-transform active:scale-95 w-full md:w-auto justify-center"
            >
              <PlayIcon className="w-8 h-8" />
              <span>Read Aloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <section className="bg-access-card p-6 rounded-2xl border border-access-border shadow-sm">
        <h3 className="text-xl font-bold text-access-accent mb-3">📖 Reading (Extracted Text)</h3>
        <p className="text-xl leading-relaxed text-access-text/90 whitespace-pre-wrap">
          {content.short_reading}
        </p>
      </section>

      <section className="bg-access-card p-6 rounded-2xl border-l-8 border-access-accent shadow-sm">
        <h3 className="text-xl font-bold text-access-accent mb-3">💡 Simple Explanation</h3>
        <p className="text-2xl leading-relaxed font-medium text-access-text">
          {content.simple_explanation}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-access-accent mb-4">🔑 Key Points</h3>
        <ul className="space-y-4">
          {content.key_points.map((point, index) => (
            <li key={index} className="flex gap-4 items-start bg-access-card p-4 rounded-xl border border-access-border shadow-sm">
              <span className="bg-access-accent text-black font-bold w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-xl text-access-text pt-0.5">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30 shadow-sm">
        <h3 className="text-xl font-bold text-blue-500 mb-3">🌟 Example</h3>
        <p className="text-xl italic text-access-text/90">
          "{content.example}"
        </p>
      </section>

      <section className="bg-green-900/20 p-6 rounded-2xl border border-green-500/30 mb-12 shadow-sm">
        <h3 className="text-xl font-bold text-green-500 mb-3">❓ Quick Quiz</h3>
        <p className="text-2xl font-bold text-access-text">
          {content.quiz}
        </p>
      </section>
    </div>
  );
};
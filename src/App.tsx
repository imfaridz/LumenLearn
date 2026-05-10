import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  ChevronRight, 
  BrainCircuit, 
  CheckCircle2, 
  Rocket, 
  Sparkles,
  Baby,
  Zap,
  Briefcase,
  Scroll,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { PersonaType, LearningModule, PERSONA_CONFIG } from './types';
import { extractTextFromPDF } from './lib/pdfWorker';
import { generateLearningContent } from './services/geminiService';
import confetti from 'canvas-confetti';

// --- Utility for dynamic classes ---
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Sub-components ---

function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-indigo-500/30"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            scale: Math.random() * 0.5 + 0.5,
            rotate: 0
          }}
          animate={{ 
            y: ["-10%", "110%"],
            rotate: 360,
          }}
          transition={{ 
            duration: Math.random() * 20 + 20, 
            repeat: Infinity, 
            ease: "linear",
            delay: -Math.random() * 20
          }}
        >
          <BrainCircuit size={Math.random() * 40 + 20} className="blur-[1px]" />
        </motion.div>
      ))}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute text-amber-400/20"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            scale: 0
          }}
          animate={{ 
            scale: [0, 1.2, 0],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: Math.random() * 5 + 5, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5
          }}
        >
          <Sparkles size={Math.random() * 30 + 15} />
        </motion.div>
      ))}
    </div>
  );
}

function PersonaCard({ persona, selected, onClick, index }: { persona: PersonaType, selected: boolean, onClick: () => void, index: number }) {
  const config = PERSONA_CONFIG[persona];
  const Icon = { Baby, Zap, Briefcase, Scroll }[config.icon as any] || BrainCircuit;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.05,
        y: -10,
        backgroundColor: "rgba(248, 250, 252, 1)"
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      id={`persona-${persona.toLowerCase()}`}
      className={cn(
        "persona-btn relative flex flex-col items-center p-8 rounded-[32px] border transition-all duration-300 text-center w-full group",
        selected 
          ? "bg-indigo-50 border-indigo-200 shadow-[0_20px_50px_rgba(79,70,229,0.15)] ring-2 ring-indigo-500 ring-offset-4" 
          : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50"
      )}
    >
      {selected && (
        <motion.div 
          layoutId="highlight"
          className="absolute inset-0 bg-indigo-500/5 rounded-[32px] -z-10"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <div className={cn(
        "w-16 h-16 rounded-2xl mb-4 flex items-center justify-center shadow-lg transition-all duration-500 relative",
        selected ? "bg-indigo-600 text-white scale-110 rotate-3" : "bg-slate-100 text-slate-400 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-400"
      )}>
        <Icon size={32} className={cn("transition-transform duration-500", !selected && "group-hover:animate-pulse")} />
        {selected && (
          <motion.div
            layoutId="sparkle-glow"
            className="absolute -inset-1 bg-indigo-600 blur-xl opacity-20 -z-10 rounded-3xl"
          />
        )}
      </div>
      <h3 className={cn("text-xl font-bold mb-1 transition-colors", selected ? "text-indigo-900" : "text-slate-800 group-hover:text-indigo-900")}>
        {config.name}
      </h3>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-3">
        {config.ageRange} Years
      </p>
      <p className="text-sm text-slate-500 leading-relaxed max-w-[200px] transition-colors group-hover:text-slate-600">
        {config.description}
      </p>
    </motion.button>
  );
}

// --- Main Application ---

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [learningModule, setLearningModule] = useState<LearningModule | null>(null);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [currentView, setCurrentView] = useState<'CONTENT' | 'FACT' | 'QUIZ' | 'FINAL' | 'COMPLETE'>('CONTENT');
  const [nodeScores, setNodeScores] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isTextMeaningful = (text: string): boolean => {
    const trimmed = text.trim();
    // Check for minimum length
    if (trimmed.length < 50) return false;
    
    // Check for alphanumeric content ratio (avoids purely symbolic or empty PDFs)
    const alphanumericCount = (trimmed.match(/[a-z0-9]/gi) || []).length;
    if (alphanumericCount / trimmed.length < 0.2) return false;
    
    // Check for minimum word count
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 10) return false;

    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPersona) return;

    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const text = await extractTextFromPDF(file);
      
      if (!isTextMeaningful(text)) {
        setErrorMessage("This PDF does not contain meaningful content. Please upload a textbook, research paper, or guide.");
        setIsProcessing(false);
        return;
      }

      const module = await generateLearningContent(text, selectedPersona);
      setLearningModule(module);
      setStep(3);
    } catch (error) {
      console.error("Processing failed:", error);
      alert("Failed to process PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const nextNode = (score?: number) => {
    if (!learningModule) return;
    
    if (currentView === 'CONTENT') {
      const questions = learningModule.intermittentQuizzes?.[currentNodeIndex] || [];
      if (questions.length > 0) {
        setCurrentView('QUIZ');
      } else {
        // Skip quiz if missing and try to move to next node or final
        if (currentNodeIndex < learningModule.nodes.length - 1) {
          setCurrentNodeIndex(prev => prev + 1);
          setCurrentView('CONTENT');
        } else {
          setCurrentView('FINAL');
        }
      }
    } else if (currentView === 'QUIZ') {
      if (score !== undefined) {
        setNodeScores(prev => ({ ...prev, [currentNodeIndex]: score }));
      }
      if (currentNodeIndex < learningModule.nodes.length - 1) {
        setCurrentNodeIndex(prev => prev + 1);
        setCurrentView('CONTENT');
      } else {
        setCurrentView('FINAL');
      }
    }
  };

  const handleFinalComplete = (score: number) => {
    setQuizScore(score);
    setCurrentView('COMPLETE');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <BrainCircuit className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">LumenLearn AI</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Knowledge Adaptation Engine
            </p>
          </div>
        </div>

        {step > 1 && (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Persona:</span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              {PERSONA_CONFIG[selectedPersona!].name}
            </span>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Persona Selection */}
          {step === 1 && (
            <motion.div 
              key="step-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto relative px-4"
            >
              <FloatingElements />
              
              <div className="text-center mb-16 relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-[0.3em] mb-6 border border-indigo-100">
                    The Smart Adaptation Engine
                  </span>
                  <h2 className="text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                    Ready for a Learning <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">Superpower?</span>
                  </h2>
                  <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto">Pick your vibe below and we'll transform your document into pure gold!</p>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                {(Object.keys(PERSONA_CONFIG) as PersonaType[]).map((p, idx) => (
                  <PersonaCard 
                    key={p} 
                    persona={p} 
                    selected={selectedPersona === p}
                    index={idx}
                    onClick={() => setSelectedPersona(p)}
                  />
                ))}
              </div>

              <div className="mt-16 flex justify-center relative z-10">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  disabled={!selectedPersona}
                  onClick={() => setStep(2)}
                  className="group relative flex items-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-[24px] font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                >
                  Confirm Choice 
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Upload */}
          {step === 2 && (
            <motion.div 
              key="step-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-2xl mx-auto"
            >
              <button 
                onClick={() => setStep(1)}
                className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest transition-colors"
                id="back-to-persona"
              >
                <ArrowLeft size={14} /> Back to Personas
              </button>

              <div className="bg-white rounded-[40px] p-16 text-center border border-slate-200 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
                <div className="mb-8 mx-auto w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-indigo-600 border border-slate-100 shadow-inner">
                  {isProcessing ? (
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                  ) : (
                    <FileText size={48} />
                  )}
                </div>
                <h3 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">Upload PDF Source</h3>
                <p className="text-slate-500 mb-10 text-lg leading-relaxed">
                  Upload your textbook, research paper, or guide.<br/> We'll distill it into high-value knowledge nodes.
                </p>

                <AnimatePresence>
                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold"
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <label className="relative cursor-pointer inline-block">
                  <div className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-lg hover:scale-105">
                    {isProcessing ? 'Summoning AI Genius...' : 'Start the Magic Scan'}
                  </div>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </label>
                <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Maximum file size: 25MB
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Learning Dashboard (3-Column Layout) */}
          {step === 3 && learningModule && (
            <motion.div 
              key="step-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Navigation Nodes */}
              {currentView === 'CONTENT' && (
                <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                  <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black mb-6 flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em]">
                      <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                      Content Nodes
                    </h3>
                    <div className="flex flex-col gap-3">
                      {learningModule.nodes.map((node, idx) => (
                        <div 
                          key={node.id}
                          className={cn(
                            "p-4 rounded-2xl border transition-all",
                            idx === currentNodeIndex 
                              ? "bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100" 
                              : idx < currentNodeIndex 
                                ? "bg-slate-50 border-slate-100 text-slate-400 opacity-60" 
                                : "bg-white border-slate-100 text-slate-600"
                          )}
                        >
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1 mb-2 opacity-70">
                            <span>0{idx + 1}</span>
                            <span>{idx === currentNodeIndex ? 'Now Focusing' : idx < currentNodeIndex ? 'Completed' : 'Upcoming'}</span>
                          </div>
                          <span className="text-xs font-bold leading-tight block">{node.title}</span>
                          {idx === currentNodeIndex && (
                            <div className="h-1 w-full bg-indigo-400/30 rounded-full mt-3 overflow-hidden">
                              <motion.div 
                                className="h-full bg-white" 
                                initial={{ width: 0 }}
                                animate={{ width: currentView === 'QUIZ' ? '100%' : '50%' }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              )}

              {/* Main Column: Content/Quiz */}
              <section className={cn(
                "col-span-12 flex flex-col gap-6",
                currentView === 'CONTENT' 
                  ? "lg:col-span-6" 
                  : "lg:col-span-8 lg:col-start-3"
              )}>
                <AnimatePresence mode="wait">
                  {currentView === 'CONTENT' && (
                    <motion.div 
                      key="content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 min-h-[500px] flex flex-col"
                    >
                      <div className="mb-8">
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">
                          Knowledge Mission
                        </span>
                        <h2 className="text-4xl font-black mt-4 text-slate-900 tracking-tight leading-tight">
                          {learningModule.nodes[currentNodeIndex].title}
                        </h2>
                      </div>
                      
                      <div className="flex-1 text-slate-600 text-lg leading-relaxed space-y-6">
                        {learningModule.nodes[currentNodeIndex].content.split('\n').map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>

                      <button 
                        onClick={() => nextNode()}
                        className="mt-12 w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:translate-y-[-2px] hover:shadow-indigo-200 transition-all"
                      >
                        I'm Ready for the Challenge!
                      </button>
                    </motion.div>
                  )}

                    {(currentView === 'QUIZ' || currentView === 'FINAL') && (
                      <QuizView 
                        questions={
                          currentView === 'QUIZ' 
                            ? (learningModule.intermittentQuizzes?.[currentNodeIndex] || []) 
                            : learningModule.finalAssessment
                        } 
                        isFinal={currentView === 'FINAL'}
                        onComplete={currentView === 'QUIZ' ? nextNode : handleFinalComplete}
                      />
                    )}

                  {currentView === 'COMPLETE' && (
                    <motion.div 
                      key="complete"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-slate-900 rounded-[40px] p-24 text-center text-white shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
                      <div className="relative z-10">
                        <div className="mx-auto w-32 h-32 bg-white text-slate-900 rounded-[32px] flex items-center justify-center mb-8 rotate-3 shadow-2xl">
                          <Rocket size={64} className="animate-bounce" />
                        </div>
                        <h2 className="text-6xl font-black mb-6 tracking-tight">Mission Accomplished!</h2>
                        <p className="text-slate-400 text-2xl font-medium max-w-lg mx-auto mb-12 leading-relaxed">
                          You've totally crushed <span className="text-indigo-400 font-black">{learningModule.topic}</span>! You're now a certified expert and ready for your next big challenge.
                        </p>

                        <button 
                          onClick={() => window.location.reload()}
                          className="px-16 py-6 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-indigo-900/50 hover:bg-indigo-500 hover:scale-105 transition-all mb-16"
                        >
                          Conquer Another Document
                        </button>

                        <div className="max-w-md mx-auto text-left bg-white/5 p-10 rounded-[32px] border border-white/5 backdrop-blur-md">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Knowledge Mastery Report
                          </h4>
                          <ul className="space-y-4">
                            {learningModule.nodes.map((node, i) => {
                              const score = nodeScores[i];
                              const total = learningModule.intermittentQuizzes?.[i]?.length || 0;
                              const percentage = total > 0 ? Math.round(((score || 0) / total) * 100) : 100;
                              
                              return (
                                <motion.li
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 + 0.5 }}
                                  key={node.id}
                                  className="flex items-center justify-between group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full group-hover:scale-150 transition-transform" />
                                    <span className="text-slate-300 font-bold text-sm tracking-tight">{node.title}</span>
                                  </div>
                                  <span className={cn(
                                    "text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest",
                                    percentage >= 80 ? "text-emerald-400 bg-emerald-400/10" : 
                                    percentage >= 50 ? "text-amber-400 bg-amber-400/10" : "text-rose-400 bg-rose-400/10"
                                  )}>
                                    {percentage}%
                                  </span>
                                </motion.li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Right Column: Facts & Mastery Metrics */}
              {currentView === 'CONTENT' && (
                <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                  {/* Fact Card */}
                  {learningModule.nodes[currentNodeIndex].fact && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-8 bg-rose-50 rounded-[32px] border border-rose-100 relative overflow-hidden group shadow-sm shadow-rose-100"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500">
                        <Sparkles size={64} className="text-rose-900" />
                      </div>
                      <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3">Did you know?</h4>
                      <p className="text-base text-rose-900 font-bold leading-snug">
                        {learningModule.nodes[currentNodeIndex].fact}
                      </p>
                    </motion.div>
                  )}

                  {/* Reinforced Learning (Previous Topics) */}
                  {currentNodeIndex > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 bg-indigo-50 border border-indigo-100 rounded-[24px]"
                    >
                      <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Zap size={12} /> Don't Forget
                      </h4>
                      <p className="text-xs text-indigo-900 font-medium leading-relaxed italic">
                        "{learningModule.nodes[currentNodeIndex - 1].reinforcement}"
                      </p>
                    </motion.div>
                  )}

                  {/* Node Summary */}
                  <motion.div 
                    key={`summary-${currentNodeIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-100 rounded-[24px] border border-slate-200"
                  >
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Module Summary</h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {learningModule.nodes[currentNodeIndex].summary}
                    </p>
                  </motion.div>
                </aside>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

function QuizView({ questions = [], onComplete, isFinal }: { questions: any[], onComplete: (score?: any) => void, isFinal?: boolean }) {
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const currentQ = questions[index];

  // Reset selection state whenever we move to a new question to prevent "already answered" bugs
  useEffect(() => {
    setSelectedOption(null);
    setIsConfirmed(false);
  }, [index]);

  if (!currentQ) {
    return (
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-xl font-bold text-slate-800">Hang on, something is missing!</h3>
        <p className="text-slate-500 mt-2 mb-6">We couldn't find questions for this section.</p>
        <button 
          onClick={() => onComplete()}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
        >
          Skip to Next Section
        </button>
      </div>
    );
  }

  const handleConfirm = () => {
    if (selectedOption === currentQ.correctAnswer) {
      setCorrectAnswersCount(prev => prev + 1);
    }
    setIsConfirmed(true);
  };

  const nextQuestion = () => {
    if (index < questions.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      // Pass the most up-to-date score
      onComplete(correctAnswersCount);
    }
  };

  return (
    <motion.div 
      key={`quiz-${index}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 min-h-[500px] flex flex-col relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5">
        <BrainCircuit size={160} className="text-indigo-900" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-10">
          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">
            {isFinal ? 'Final Mastery Check' : 'Cognitive Check-in'}
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {index + 1} of {questions.length}</span>
        </div>

        <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tight leading-snug">
          {currentQ.question}
        </h3>

        <div className="space-y-4 mb-2">
          {currentQ.options.map((opt: string, i: number) => (
            <button
              key={i}
              disabled={isConfirmed}
              onClick={() => setSelectedOption(i)}
              className={cn(
                "w-full p-5 text-left rounded-3xl border-2 transition-all flex items-center gap-4 group",
                selectedOption === i 
                  ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10" 
                  : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50",
                isConfirmed && i === currentQ.correctAnswer && "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10",
                isConfirmed && selectedOption === i && i !== currentQ.correctAnswer && "border-rose-500 bg-rose-50 ring-4 ring-rose-500/10"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-colors",
                selectedOption === i && !isConfirmed ? "bg-indigo-600 border-indigo-600 text-white" : 
                isConfirmed && i === currentQ.correctAnswer ? "bg-emerald-500 border-emerald-500 text-white" :
                "border-slate-200 text-slate-400 group-hover:border-indigo-400"
              )}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className={cn(
                "text-base font-bold",
                selectedOption === i ? "text-indigo-900" : "text-slate-700",
                isConfirmed && i === currentQ.correctAnswer && "text-emerald-900",
                isConfirmed && selectedOption === i && i !== currentQ.correctAnswer && "text-rose-900"
              )}>{opt}</span>
            </button>
          ))}
        </div>

        {isConfirmed && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              <span className="font-black uppercase text-[10px] text-indigo-600 block mb-2 tracking-widest leading-none">Perspective</span>
              {currentQ.explanation}
            </p>
          </motion.div>
        )}

        <div className="mt-12 flex gap-4 pt-4 border-t border-slate-100">
          {!isConfirmed ? (
            <button 
              disabled={selectedOption === null}
              onClick={handleConfirm}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:translate-y-[-2px] hover:shadow-indigo-200 disabled:opacity-50 transition-all font-black"
            >
              Lock in My Answer!
            </button>
          ) : (
            <button 
              onClick={nextQuestion}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 hover:translate-y-[-2px] hover:shadow-slate-800 transition-all font-black"
            >
              {index < questions.length - 1 ? 'Show Me More Key Facts!' : isFinal ? 'Calculate My Victory Score!' : 'Return to My Learning Mission'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}


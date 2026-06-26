'use client';

import { useState } from 'react';

// Added the "text" property so the student can actually read the question
const QUESTION_OPTIONS = [
  { id: 'q1', title: 'Metal vs. Wooden Spoon', text: 'Why does a metal spoon feel hotter than a wooden spoon when placed in hot soup?' },
  { id: 'q2', title: 'Evaporation Dynamics', text: 'Explain why clothes dry faster on a windy day compared to a still day.' },
  { id: 'q3', title: 'Plant Transport Systems', text: 'What will happen to a plant if its xylem vessels are completely blocked?' }
];

export default function StudentPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State is now mapped by question ID so data isn't lost when navigating
  const [typedAnswers, setTypedAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const currentQuestion = QUESTION_OPTIONS[currentIndex];
  const currentResult = results[currentQuestion.id];

  const handleNext = () => {
    if (currentIndex < QUESTION_OPTIONS.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const typedAnswer = typedAnswers[currentQuestion.id] || '';
    const file = files[currentQuestion.id] || null;

    const formData = new FormData();
    formData.append('questionId', currentQuestion.id);
    if (file) formData.append('file', file);
    if (typedAnswer) formData.append('typedAnswer', typedAnswer);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      // Save the AI feedback specifically to this question's ID
      setResults(prev => ({ ...prev, [currentQuestion.id]: data }));
    } catch (error) {
      console.error('Error submitting work:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        
        {/* Header & Navigation */}
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">TutorAssist AI</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handlePrevious} 
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded disabled:opacity-50 hover:bg-gray-200 transition"
            >
              ← Previous
            </button>
            <span className="text-sm font-bold text-gray-500">
              Question {currentIndex + 1} of {QUESTION_OPTIONS.length}
            </span>
            <button 
              onClick={handleNext} 
              disabled={currentIndex === QUESTION_OPTIONS.length - 1}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded disabled:opacity-50 hover:bg-gray-200 transition"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Question Display */}
        <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r shadow-sm">
          <h2 className="text-lg font-bold text-blue-900 mb-2">{currentQuestion.title}</h2>
          <p className="text-gray-800 text-lg">{currentQuestion.text}</p>
        </div>
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PDF Upload Section */}
          <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center bg-gray-50 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Worksheet (PDF)</label>
            <input 
              type="file" 
              accept="application/pdf"
              key={currentQuestion.id} // Forces input reset when changing questions
              onChange={(e) => setFiles(prev => ({ ...prev, [currentQuestion.id]: e.target.files?.[0] || null }))}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {files[currentQuestion.id] && (
              <p className="mt-2 text-xs text-green-600 font-semibold">Attached: {files[currentQuestion.id]?.name}</p>
            )}
          </div>

          <div className="text-center text-gray-400 font-bold text-xs tracking-wider">OR SUBMIT DIRECT TYPING</div>

          {/* Typed Text Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer Input</label>
            <textarea 
              rows={4}
              value={typedAnswers[currentQuestion.id] || ''}
              onChange={(e) => setTypedAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              placeholder="Type your explanation statements here..."
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || (!files[currentQuestion.id] && !typedAnswers[currentQuestion.id])}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-md"
          >
            {loading ? 'AI Engine Evaluating...' : 'Submit Answer & Get Feedback'}
          </button>
        </form>

        {/* Results Section (Only displays if AI has returned a result for the current question) */}
        {currentResult && currentResult.success && (
          <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200 shadow-inner">
            <h2 className="text-xl font-bold text-green-900 mb-4">AI Diagnostic Feedback</h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Captured Input Text</span>
                <p className="text-gray-800 bg-white p-3 rounded border border-gray-100 text-sm mt-1">"{currentResult.extractedText}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Correctness Status</span>
                  <span className="inline-block mt-1 px-3 py-1 bg-white border border-green-300 rounded text-green-800 font-bold text-sm shadow-sm">
                    {currentResult.analysis?.correctness}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Classification Category</span>
                  <span className="inline-block mt-1 px-3 py-1 bg-white border border-red-200 rounded text-red-700 font-semibold text-sm shadow-sm">
                    {currentResult.analysis?.error_category || 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Flagged Omitted Keywords</span>
                <p className="text-sm font-semibold text-red-600 mt-1">
                  {currentResult.analysis?.missing_keywords?.length > 0 
                    ? currentResult.analysis.missing_keywords.join(', ') 
                    : 'None - All targeted parameters addressed.'}
                </p>
              </div>

              <div className="pt-2 border-t border-green-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Remedial Guidance</span>
                <p className="text-gray-800 text-sm mt-1 bg-white p-4 rounded border border-green-100 leading-relaxed shadow-sm">
                  {currentResult.analysis?.feedback}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
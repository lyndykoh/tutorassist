import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const typedAnswer = formData.get('typedAnswer') as string | null;
    const questionId = formData.get('questionId') as string | null;
    
    if (!questionId) {
      return NextResponse.json({ success: false, error: 'Missing selected question ID.' }, { status: 400 });
    }

    // 1. Dynamic File Resolution
    const jsonPath = path.join(process.cwd(), 'data', 'questions.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const questionBank = JSON.parse(fileContents);
    const selectedTarget = questionBank[questionId];

    if (!selectedTarget) {
      return NextResponse.json({ success: false, error: 'Target question configuration not found.' }, { status: 404 });
    }

    // 2. Validate Text Input
    if (!typedAnswer || typedAnswer.trim() === '') {
      return NextResponse.json({ success: false, error: 'No text answer provided.' }, { status: 400 });
    }

    // 3. Dynamic Prompt Generation
    const runtimePrompt = `
      Question Context: ${selectedTarget.question}
      Expected Rubric Targets:
      ${selectedTarget.rubric.map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')}

      Student Answer Content: "${typedAnswer}"
    `;

    // 4. Execution Call to Local Ollama
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tutorassist-ai', 
        prompt: runtimePrompt,
        stream: false,
        format: 'json'
      }),
    });

    const aiData = await ollamaResponse.json();
    
    // Safety Fallback: Catch raw string variations if the model deviates from JSON
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiData.response);
    } catch (parseError) {
      console.warn("AI didn't clean parse, falling back to text mapping:", aiData.response);
      parsedAnalysis = {
        correctness: "Analysis Complete",
        missing_keywords: [],
        error_category: "Unclassified",
        feedback: aiData.response
      };
    }

    return NextResponse.json({ 
      success: true, 
      extractedText: typedAnswer, 
      analysis: parsedAnalysis,
      questionMeta: selectedTarget.question
    });

  } catch (error) {
    console.error("System Orchestration Failure:", error);
    return NextResponse.json({ success: false, error: 'Pipeline Execution Failed' }, { status: 500 });
  }
}
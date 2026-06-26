// import { NextResponse } from 'next/server';
// import { createRequire } from 'module';
// import { promises as fs } from 'fs';
// import path from 'path';

// const require = createRequire(import.meta.url);
// const pdfParse = require('pdf-parse');

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') as File | null;
//     const typedAnswer = formData.get('typedAnswer') as string | null;
//     const questionId = formData.get('questionId') as string | null;
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse'; // Use the standard, clean import

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
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

    let studentText = '';

    // 2. Process Input Source (PDF or Direct Typing)
    if (file && file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer); 
      studentText = pdfData.text;
    } else if (typedAnswer) {
      studentText = typedAnswer;
    } else {
      return NextResponse.json({ error: 'No PDF or text answer provided.' }, { status: 400 });
    }

    // 3. Dynamic Prompt Generation using the retrieved data
    const runtimePrompt = `
      Question Context: ${selectedTarget.question}
      Expected Rubric Targets:
      ${selectedTarget.rubric.map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')}

      Student Answer Content: "${studentText}"
    `;

    // 4. Execution Call to Local Ollama Custom Instance
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
      extractedText: studentText, 
      analysis: parsedAnalysis,
      questionMeta: selectedTarget.question
    });

  } catch (error) {
    console.error("System Orchestration Failure:", error);
    return NextResponse.json({ success: false, error: 'Pipeline Execution Failed' }, { status: 500 });
  }
}
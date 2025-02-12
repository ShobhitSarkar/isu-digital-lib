import os
import json
import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# Cross-paper analysis questions
CONTEXT_QUESTIONS = {
    'comparative': [
        'What are the main methodological differences between these papers?',
        'How do the papers complement or contradict each other?'
    ],
    'thematic': [
        'What common themes or patterns emerge across all papers?',
        'How do these papers collectively advance the field?'
    ],
    'synthesis': [
        'What are the shared limitations across these papers?',
        'What future research directions are suggested by considering all papers together?'
    ]
}

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    with pdfplumber.open(pdf_path) as pdf:
        text = '\n'.join(page.extract_text() for page in pdf.pages if page.extract_text())
    return text

def analyze_context():
    """Analyze papers in context together."""
    papers_dir = '../data/papers'
    papers_text = []
    
    # Load papers
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            text = extract_text_from_pdf(paper_path)
            papers_text.append(f"=== Paper {i} ===\n{text}")
    
    # Combine all papers
    combined_text = "\n\n".join(papers_text)
    results = []
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Process each category of questions
    for category, questions in CONTEXT_QUESTIONS.items():
        print(f"\nProcessing {category} questions...")
        for question in questions:
            print(f"Analyzing: {question}")
            
            prompt = f"""Analyze these research papers together and answer:
            {question}
            
            Please consider all papers in your analysis and provide specific examples.
            
            Papers content:
            {combined_text}"""
            
            try:
                response = model.generate_content(prompt)
                results.append({
                    'category': category,
                    'question': question,
                    'response': response.text,
                    'timestamp': datetime.now().isoformat()
                })
            except Exception as e:
                print(f"Error with question '{question}': {e}")
                results.append({
                    'category': category,
                    'question': question,
                    'response': None,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
    
    return results

def main():
    print("Starting cross-paper context analysis...")
    results = analyze_context()
    
    # Save results
    os.makedirs('data/results', exist_ok=True)
    output_file = 'data/results/context_qa_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nAnalysis complete! Results saved to {output_file}")

if __name__ == "__main__":
    main()
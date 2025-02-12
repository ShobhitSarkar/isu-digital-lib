import os
import json
import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# Basic questions for individual paper analysis
BASIC_QUESTIONS = {
    'main_findings': 'What are the main findings or contributions of this paper?',
    'methodology': 'What methodology or approach does this paper use?',
    'results': 'What are the key results and their significance?',
    'limitations': 'What are the limitations or challenges identified in this work?',
    'future_work': 'What future work or research directions are suggested?'
}

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    with pdfplumber.open(pdf_path) as pdf:
        text = '\n'.join(page.extract_text() for page in pdf.pages if page.extract_text())
    return text

def analyze_single_paper(paper_path):
    """Analyze a single paper with basic questions."""
    print(f"\nAnalyzing {os.path.basename(paper_path)}")
    text = extract_text_from_pdf(paper_path)
    results = []
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    for q_id, question in BASIC_QUESTIONS.items():
        print(f"Processing question: {q_id}")
        prompt = f"Based on this paper, please answer: {question}\n\nPaper content: {text}"
        
        try:
            response = model.generate_content(prompt)
            results.append({
                'question_id': q_id,
                'question': question,
                'response': response.text,
                'timestamp': datetime.now().isoformat()
            })
        except Exception as e:
            print(f"Error with question {q_id}: {e}")
            results.append({
                'question_id': q_id,
                'question': question,
                'response': None,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    return results

def main():
    papers_dir = '../data/papers'
    all_results = {}
    
    # Process first 3 papers only
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            all_results[f'paper-{i}'] = analyze_single_paper(paper_path)
    
    # Save results
    os.makedirs('data/results', exist_ok=True)
    output_file = 'data/results/basic_qa_results.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\nAnalysis complete! Results saved to {output_file}")

if __name__ == "__main__":
    main()
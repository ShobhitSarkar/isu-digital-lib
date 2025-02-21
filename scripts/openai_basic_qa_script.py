import os
import json
import pdfplumber
from datetime import datetime
from openai_interface import OpenAIInterface

# Questions for individual paper analysis
BASIC_QUESTIONS = {
    'main_findings': 'What are the main findings or contributions of this paper?',
    'methodology': 'What methodology or approach does this paper use?',
    'results': 'What are the key results and their significance?',
    'limitations': 'What are the limitations or challenges identified in this work?',
}

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = '\n'.join(page.extract_text() for page in pdf.pages if page.extract_text())
        print(f"Successfully extracted {len(text)} characters from {pdf_path}")
        return text
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return None

def analyze_single_paper(paper_path, model):
    """Analyze a single paper with basic questions."""
    print(f"\nAnalyzing {os.path.basename(paper_path)}")
    text = extract_text_from_pdf(paper_path)
    if not text:
        print(f"No text could be extracted from {paper_path}")
        return []
    
    results = []
    for q_id, question in BASIC_QUESTIONS.items():
        print(f"Processing question: {q_id}")
        prompt = f"Based on this academic paper, please answer the following question thoroughly and precisely: {question}\n\nPaper content: {text}"
        
        try:
            response = model.generate_response(prompt)
            results.append({
                'question_id': q_id,
                'question': question,
                'response': response,
                'timestamp': datetime.now().isoformat()
            })
            print(f"Successfully processed question: {q_id}")
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
    # Initialize OpenAI model
    print("Initializing OpenAI model...")
    model = OpenAIInterface()
    
    # Setup directories
    papers_dir = '../data/papers'  # Changed path
    results_dir = 'data/openai_results'  # Changed path
    os.makedirs(results_dir, exist_ok=True)
    
    all_results = {}
    
    # Process papers
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            print(f"\nProcessing paper {i}...")
            all_results[f'paper-{i}'] = analyze_single_paper(paper_path, model)
        else:
            print(f"Warning: Could not find {paper_path}")
    
    # Save results
    output_file = os.path.join(results_dir, 'basic_qa_results.json')
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\nAnalysis complete! Results saved to {output_file}")

if __name__ == "__main__":
    main()
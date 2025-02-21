import os
import json
import pdfplumber
import google.generativeai as genai
import chromadb
from dotenv import load_dotenv
from datetime import datetime
import time

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# Questions for vectorized analysis
VECTOR_QUESTIONS = {
    'core_concepts': 'What are the core concepts and ideas presented in this paper?',
    'technical_approach': 'Explain the technical approach and implementation details.',
    'evaluation': 'How does the paper evaluate its proposed solution?',
    'innovation': 'What are the novel or innovative aspects of this work?',
}

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = '\n'.join(page.extract_text() for page in pdf.pages if page.extract_text())
            print(f"Extracted {len(text)} characters from {pdf_path}")
            return text
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return ""

def get_response_with_retry(model, prompt, max_retries=3):
    """Get response from Gemini with retry logic"""
    for attempt in range(max_retries):
        try:
            time.sleep(2)  # Add delay between API calls
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(5)  # Longer delay before retry
            else:
                return f"Error after {max_retries} attempts: {str(e)}"

def analyze_with_vectors():
    """Analyze papers using vector search."""
    # Initialize Gemini model
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Initialize ChromaDB
    client = chromadb.Client()
    try:
        client.delete_collection("papers_collection")
    except:
        pass
    collection = client.create_collection("papers_collection")
    
    papers_dir = '../data/papers'
    results = {}
    
    print("\nLoading papers into vector store...")
    
    # Load papers into vector store
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            print(f"Loading {paper_path}")
            text = extract_text_from_pdf(paper_path)
            if text:
                collection.add(
                    documents=[text],
                    ids=[f"paper-{i}"],
                    metadatas=[{"source": f"paper-{i}"}]
                )
    
    print(f"\nNumber of documents in collection: {collection.count()}")
    
    # Process each paper
    for i in range(1, 4):
        paper_id = f"paper-{i}"
        print(f"\nAnalyzing {paper_id}")
        paper_results = []
        
        for q_id, question in VECTOR_QUESTIONS.items():
            print(f"Processing question: {q_id}")
            try:
                # Get relevant sections
                query_results = collection.query(
                    query_texts=[question],
                    n_results=1,
                    where={"source": paper_id}
                )
                
                if query_results['documents'] and query_results['documents'][0]:
                    context = query_results['documents'][0][0]
                    prompt = f"Based on this paper section, please answer: {question}\n\nContent: {context}"
                    
                    response = get_response_with_retry(model, prompt)
                    paper_results.append({
                        'question_id': q_id,
                        'question': question,
                        'response': response,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # Save intermediate results after each question
                    results[paper_id] = paper_results
                    save_results(results)
                    
            except Exception as e:
                print(f"Error with question {q_id}: {e}")
                paper_results.append({
                    'question_id': q_id,
                    'question': question,
                    'response': None,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
    
    return results

def save_results(results):
    """Save results with error handling"""
    try:
        os.makedirs('../data/results', exist_ok=True)
        output_file = '../data/results/vector_qa_results.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved successfully to {output_file}")
    except Exception as e:
        print(f"Error saving results: {e}")

def main():
    print("Starting vectorized paper analysis...")
    results = analyze_with_vectors()
    save_results(results)
    print("\nAnalysis complete!")

if __name__ == "__main__":
    main()
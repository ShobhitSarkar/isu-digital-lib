import os
import json
import pdfplumber
import google.generativeai as genai
import chromadb
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# Questions for vectorized analysis
VECTOR_QUESTIONS = {
    'core_concepts': 'What are the core concepts and ideas presented in this paper?',
    'technical_approach': 'Explain the technical approach and implementation details.',
    'evaluation': 'How does the paper evaluate its proposed solution?',
    'innovation': 'What are the novel or innovative aspects of this work?',
    'impact': 'What is the potential impact of this work on the field?'
}

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    with pdfplumber.open(pdf_path) as pdf:
        text = '\n'.join(page.extract_text() for page in pdf.pages if page.extract_text())
    return text

def setup_vector_db():
    """Initialize ChromaDB."""
    client = chromadb.Client()
    # Reset collection if it exists
    try:
        client.delete_collection("papers_collection")
    except:
        pass
    return client.create_collection("papers_collection")

def analyze_with_vectors():
    """Analyze papers using vector search."""
    collection = setup_vector_db()
    papers_dir = '../data/papers'
    results = {}
    
    # Load papers into vector store
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            text = extract_text_from_pdf(paper_path)
            collection.add(
                documents=[text],
                ids=[f"paper-{i}"]
            )
    
    # Query for each paper
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    for i in range(1, 4):
        paper_id = f"paper-{i}"
        print(f"\nAnalyzing {paper_id}")
        paper_results = []
        
        for q_id, question in VECTOR_QUESTIONS.items():
            print(f"Processing question: {q_id}")
            
            # Get relevant sections using vector similarity
            query_results = collection.query(
                query_texts=[question],
                n_results=1,
                where={"$id": paper_id}
            )
            
            if query_results['documents']:
                context = query_results['documents'][0][0]
                prompt = f"Based on this paper section, please answer: {question}\n\nContent: {context}"
                
                try:
                    response = model.generate_content(prompt)
                    paper_results.append({
                        'question_id': q_id,
                        'question': question,
                        'response': response.text,
                        'timestamp': datetime.now().isoformat()
                    })
                except Exception as e:
                    print(f"Error with question {q_id}: {e}")
                    paper_results.append({
                        'question_id': q_id,
                        'question': question,
                        'response': None,
                        'error': str(e),
                        'timestamp': datetime.now().isoformat()
                    })
        
        results[paper_id] = paper_results
    
    return results

def main():
    print("Starting vectorized paper analysis...")
    results = analyze_with_vectors()
    
    # Save results
    os.makedirs('data/results', exist_ok=True)
    output_file = 'data/results/vector_qa_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nAnalysis complete! Results saved to {output_file}")

if __name__ == "__main__":
    main()
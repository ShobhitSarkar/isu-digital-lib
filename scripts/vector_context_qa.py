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

# Questions for vectorized cross-paper analysis
VECTOR_CONTEXT_QUESTIONS = {
    'methodology': 'Compare and contrast the methodological approaches across all papers.',
    'results': 'How do the results and findings relate across the papers?',
    'challenges': 'What common challenges or limitations are identified across the papers?',
    'advancement': 'How do these papers build upon or advance each other\'s work?',
    'integration': 'How might the approaches from these papers be integrated or combined?'
}

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    with pdfplumber.open(pdf_path) as pdf:
        text = '\n'.join(page.extract_text() for page in pdf.pages if page.extract_text())
    return text

def setup_vector_db():
    """Initialize ChromaDB."""
    client = chromadb.Client()
    try:
        client.delete_collection("context_collection")
    except:
        pass
    return client.create_collection("context_collection")

def analyze_context_with_vectors():
    """Analyze papers using vector search across all papers."""
    collection = setup_vector_db()
    papers_dir = '../data/papers'
    results = []
    
    # Load and chunk papers
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            text = extract_text_from_pdf(paper_path)
            # Add paper as both complete document and smaller chunks
            collection.add(
                documents=[text],
                metadatas=[{"paper_id": f"paper-{i}", "type": "full"}],
                ids=[f"paper-{i}-full"]
            )
            # Split into smaller chunks for more granular retrieval
            chunks = text.split('\n\n')
            for j, chunk in enumerate(chunks):
                if chunk.strip():
                    collection.add(
                        documents=[chunk],
                        metadatas=[{"paper_id": f"paper-{i}", "chunk_id": j, "type": "chunk"}],
                        ids=[f"paper-{i}-chunk-{j}"]
                    )
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Process each question
    for q_id, question in VECTOR_CONTEXT_QUESTIONS.items():
        print(f"\nProcessing question: {q_id}")
        
        # Get relevant sections from across all papers
        query_results = collection.query(
            query_texts=[question],
            n_results=5  # Get top 5 most relevant chunks
        )
        
        # Combine relevant contexts with paper identification
        contexts = []
        for doc, metadata in zip(query_results['documents'][0], query_results['metadatas'][0]):
            paper_id = metadata['paper_id']
            contexts.append(f"From {paper_id}:\n{doc}")
        
        combined_context = "\n\n".join(contexts)
        
        prompt = f"""Based on these sections from multiple papers, please answer:
        {question}
        
        Please provide a comprehensive analysis that draws from all relevant papers.
        
        Relevant sections:
        {combined_context}"""
        
        try:
            response = model.generate_content(prompt)
            results.append({
                'question_id': q_id,
                'question': question,
                'response': response.text,
                'relevant_papers': [m['paper_id'] for m in query_results['metadatas'][0]],
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
    print("Starting vectorized cross-paper context analysis...")
    results = analyze_context_with_vectors()
    
    # Save results
    os.makedirs('data/results', exist_ok=True)
    output_file = 'data/results/vector_context_qa_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nAnalysis complete! Results saved to {output_file}")
    
    # Print results for immediate review
    for result in results:
        print(f"\nQuestion: {result['question']}")
        print("-" * 80)
        print(f"Response: {result['response']}")
        print(f"Relevant papers: {result['relevant_papers']}")
        print("=" * 80)

if __name__ == "__main__":
    main()
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

# Questions for vectorized cross-paper analysis
VECTOR_CONTEXT_QUESTIONS = {
    'methodology': 'Compare and contrast the methodological approaches across all papers.',
    'results': 'How do the results and findings relate across the papers?',
    'challenges': 'What common challenges or limitations are identified across the papers?',
    'advancement': 'How do these papers build upon or advance each other\'s work?',
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
    """Get response from Gemini with retry logic and rate limiting"""
    for attempt in range(max_retries):
        try:
            time.sleep(2)  # Base delay between API calls
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5  # Exponential backoff
                print(f"Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            else:
                return f"Error after {max_retries} attempts: {str(e)}"

def save_intermediate_results(results, output_file):
    """Save results with error handling"""
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved successfully to {output_file}")
    except Exception as e:
        print(f"Error saving results: {e}")

def setup_vector_db():
    """Initialize ChromaDB."""
    try:
        client = chromadb.Client()
        try:
            client.delete_collection("context_collection")
        except:
            pass
        collection = client.create_collection("context_collection")
        print("Vector database initialized successfully")
        return collection
    except Exception as e:
        print(f"Error setting up vector database: {e}")
        raise

def analyze_context_with_vectors():
    """Analyze papers using vector search across all papers."""
    output_file = '../data/results/vector_context_qa_results.json'
    collection = setup_vector_db()
    papers_dir = '../data/papers'
    results = []
    
    print("\nLoading and chunking papers...")
    # Load and chunk papers
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            print(f"Processing {paper_path}")
            text = extract_text_from_pdf(paper_path)
            if text:
                # Add full document
                collection.add(
                    documents=[text],
                    metadatas=[{"paper_id": f"paper-{i}", "type": "full"}],
                    ids=[f"paper-{i}-full"]
                )
                
                # Split and add chunks
                chunks = text.split('\n\n')
                chunk_count = 0
                for j, chunk in enumerate(chunks):
                    if chunk.strip():
                        collection.add(
                            documents=[chunk],
                            metadatas=[{"paper_id": f"paper-{i}", "chunk_id": j, "type": "chunk"}],
                            ids=[f"paper-{i}-chunk-{j}"]
                        )
                        chunk_count += 1
                print(f"Added {chunk_count} chunks for paper-{i}")
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Process each question
    for q_id, question in VECTOR_CONTEXT_QUESTIONS.items():
        print(f"\nProcessing question: {q_id}")
        
        try:
            # Get relevant sections from across all papers
            query_results = collection.query(
                query_texts=[question],
                n_results=5
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
            
            response = get_response_with_retry(model, prompt)
            result = {
                'question_id': q_id,
                'question': question,
                'response': response,
                'relevant_papers': [m['paper_id'] for m in query_results['metadatas'][0]],
                'timestamp': datetime.now().isoformat()
            }
            results.append(result)
            
            # Save after each successful response
            save_intermediate_results(results, output_file)
            
        except Exception as e:
            print(f"Error with question {q_id}: {e}")
            results.append({
                'question_id': q_id,
                'question': question,
                'response': None,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            # Save after error too
            save_intermediate_results(results, output_file)
    
    return results

def main():
    print("Starting vectorized cross-paper context analysis...")
    try:
        results = analyze_context_with_vectors()
        
        if results:
            # Final save and review
            output_file = '../data/results/vector_context_qa_results.json'
            save_intermediate_results(results, output_file)
            
            # Print results for immediate review
            for result in results:
                print(f"\nQuestion: {result['question']}")
                print("-" * 80)
                print(f"Response: {result['response']}")
                print(f"Relevant papers: {result['relevant_papers']}")
                print("=" * 80)
            
            print("\nAnalysis complete!")
        else:
            print("\nAnalysis failed to produce results")
            
    except Exception as e:
        print(f"Fatal error in analysis: {e}")

if __name__ == "__main__":
    main()
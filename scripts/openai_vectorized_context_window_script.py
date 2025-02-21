import os
import json
import pdfplumber
import chromadb
import tiktoken
from datetime import datetime
from openai_interface import OpenAIInterface

# Questions for vectorized cross-paper analysis
VECTOR_CONTEXT_QUESTIONS = {
    'methodology': 'Compare and contrast the methodological approaches across all papers.',
    'results': 'How do the results and findings relate across the papers?',
    'challenges': 'What common challenges or limitations are identified across the papers?',
    'advancement': 'How do these papers build upon or advance each other\'s work?',
}

def count_tokens(text):
    """Count the number of tokens in a text string."""
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))

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

def chunk_text(text, chunk_size=1000):
    """Split text into chunks with overlap."""
    words = text.split()
    chunks = []
    overlap = 100  # Number of words to overlap
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if count_tokens(chunk) > 2000:  # Ensure chunk isn't too large
            continue
        chunks.append(chunk)
    
    return chunks

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

def save_intermediate_results(results, output_file):
    """Save results with error handling"""
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved successfully to {output_file}")
    except Exception as e:
        print(f"Error saving results: {e}")

def analyze_context_with_vectors():
    """Analyze papers using vector search across all papers."""
    print("Starting vectorized cross-paper analysis...")
    
    # Initialize OpenAI and ChromaDB
    model = OpenAIInterface()
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
                # Split into chunks
                chunks = chunk_text(text)
                chunk_count = 0
                for j, chunk in enumerate(chunks):
                    try:
                        collection.add(
                            documents=[chunk],
                            metadatas=[{"paper_id": f"paper-{i}", "chunk_id": j}],
                            ids=[f"paper-{i}-chunk-{j}"]
                        )
                        chunk_count += 1
                    except Exception as e:
                        print(f"Error adding chunk {j} from paper {i}: {e}")
                print(f"Added {chunk_count} chunks for paper-{i}")
    
    print(f"\nTotal documents in collection: {collection.count()}")
    
    # Process each question
    for q_id, question in VECTOR_CONTEXT_QUESTIONS.items():
        print(f"\nProcessing question: {q_id}")
        
        try:
            # Get relevant sections from across all papers
            query_results = collection.query(
                query_texts=[question],
                n_results=5  # Get top 5 most relevant chunks
            )
            
            if query_results['documents'] and query_results['documents'][0]:
                # Organize contexts by paper
                paper_contexts = {}
                for doc, metadata in zip(query_results['documents'][0], query_results['metadatas'][0]):
                    paper_id = metadata['paper_id']
                    if paper_id not in paper_contexts:
                        paper_contexts[paper_id] = []
                    paper_contexts[paper_id].append(doc)
                
                # Combine contexts with paper identification
                contexts = []
                for paper_id, docs in paper_contexts.items():
                    contexts.append(f"\n=== From {paper_id} ===\n" + "\n".join(docs))
                
                combined_context = "\n\n".join(contexts)
                
                # Check token count and trim if necessary
                max_tokens = model.model_context_length - 1000  # Reserve tokens for question and response
                if count_tokens(combined_context) > max_tokens:
                    words = combined_context.split()
                    while count_tokens(' '.join(words)) > max_tokens:
                        words = words[:-100]  # Remove 100 words at a time
                    combined_context = ' '.join(words)
                
                prompt = f"""Based on these sections from multiple papers, please answer:
                {question}
                
                Please provide a comprehensive analysis that draws from all relevant papers.
                
                Relevant sections:
                {combined_context}"""
                
                response = model.generate_response(prompt)
                result = {
                    'question_id': q_id,
                    'question': question,
                    'response': response,
                    'papers_referenced': list(paper_contexts.keys()),
                    'timestamp': datetime.now().isoformat()
                }
                results.append(result)
                
                # Save intermediate results
                save_intermediate_results(
                    results, 
                    'data/openai_results/vector_context_qa_results.json'
                )
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
            # Save after error too
            save_intermediate_results(
                results, 
                'data/openai_results/vector_context_qa_results.json'
            )
    
    return results

def main():
    try:
        results = analyze_context_with_vectors()
        if results:
            save_intermediate_results(
                results, 
                'data/openai_results/vector_context_qa_results.json'
            )
            print("\nAnalysis complete!")
        else:
            print("\nAnalysis failed to produce results")
            
    except Exception as e:
        print(f"Fatal error in analysis: {e}")

if __name__ == "__main__":
    main()
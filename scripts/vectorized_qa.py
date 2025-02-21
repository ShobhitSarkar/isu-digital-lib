import os
import json
import pdfplumber
import chromadb
from datetime import datetime
from openai_interface import OpenAIInterface
import tiktoken

# Questions for vectorized analysis
VECTOR_QUESTIONS = {
    'core_concepts': 'What are the core concepts and ideas presented in this paper?',
    'technical_approach': 'Explain the technical approach and implementation details.',
    'evaluation': 'How does the paper evaluate its proposed solution?',
    'innovation': 'What are the novel or innovative aspects of this work?',
}

# Constants for text chunking
MAX_TOKENS_PER_CHUNK = 4000  # Conservative limit for GPT-4
OVERLAP = 200  # Number of words to overlap between chunks

def count_tokens(text):
    """Count the number of tokens in a text string."""
    encoding = tiktoken.get_encoding("cl100k_base")  # GPT-4's encoding
    return len(encoding.encode(text))

def chunk_text(text, max_tokens=MAX_TOKENS_PER_CHUNK):
    """Split text into chunks that don't exceed token limit."""
    words = text.split()
    chunks = []
    current_chunk = []
    current_token_count = 0
    
    for word in words:
        word_token_count = count_tokens(word + " ")
        if current_token_count + word_token_count > max_tokens:
            # Save current chunk and start new one with overlap
            chunks.append(" ".join(current_chunk))
            overlap_start = max(0, len(current_chunk) - OVERLAP)
            current_chunk = current_chunk[overlap_start:]
            current_token_count = count_tokens(" ".join(current_chunk))
        
        current_chunk.append(word)
        current_token_count += word_token_count
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

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

def setup_vector_db():
    """Initialize ChromaDB."""
    try:
        client = chromadb.Client()
        try:
            client.delete_collection("papers_collection")
        except:
            pass
        collection = client.create_collection("papers_collection")
        print("Vector database initialized successfully")
        return collection
    except Exception as e:
        print(f"Error setting up vector database: {e}")
        raise

def analyze_with_vectors():
    """Analyze papers using vector search with chunking."""
    model = OpenAIInterface()
    collection = setup_vector_db()
    papers_dir = '../data/papers'
    results = {}
    
    print("\nLoading and chunking papers...")
    
    # Load and chunk papers
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            print(f"Processing {paper_path}")
            text = extract_text_from_pdf(paper_path)
            if text:
                # Split into manageable chunks
                chunks = chunk_text(text)
                print(f"Split into {len(chunks)} chunks")
                
                # Add chunks to vector store
                for j, chunk in enumerate(chunks):
                    collection.add(
                        documents=[chunk],
                        metadatas=[{"source": f"paper-{i}", "chunk_id": j}],
                        ids=[f"paper-{i}-chunk-{j}"]
                    )
    
    # Process each paper
    for i in range(1, 4):
        paper_id = f"paper-{i}"
        print(f"\nAnalyzing {paper_id}")
        paper_results = []
        
        for q_id, question in VECTOR_QUESTIONS.items():
            print(f"Processing question: {q_id}")
            try:
                # Get most relevant chunks
                query_results = collection.query(
                    query_texts=[question],
                    n_results=2,  # Reduced from 3 to stay within token limits
                    where={"source": paper_id}
                )
                
                if query_results['documents'] and query_results['documents'][0]:
                    # Combine relevant chunks
                    context = "\n\n".join(query_results['documents'][0])
                    
                    # Ensure we're within token limits
                    if count_tokens(context) > MAX_TOKENS_PER_CHUNK:
                        context = context[:int(len(context) * MAX_TOKENS_PER_CHUNK/count_tokens(context))]
                    
                    prompt = f"""Based on these relevant sections from the paper, please answer:
                    {question}
                    
                    Please provide a thorough and precise answer based on the following content:
                    {context}"""
                    
                    response = model.generate_response(prompt)
                    paper_results.append({
                        'question_id': q_id,
                        'question': question,
                        'response': response,
                        'relevant_chunks': len(query_results['documents'][0]),
                        'timestamp': datetime.now().isoformat()
                    })
                    print(f"Successfully processed question: {q_id}")
                    
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

def save_results(results):
    """Save results with error handling"""
    try:
        results_dir = 'data/openai_results'
        os.makedirs(results_dir, exist_ok=True)
        output_file = os.path.join(results_dir, 'vector_qa_results.json')
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved successfully to {output_file}")
    except Exception as e:
        print(f"Error saving results: {e}")

def main():
    print("Starting vectorized paper analysis...")
    try:
        results = analyze_with_vectors()
        save_results(results)
        print("\nAnalysis complete!")
    except Exception as e:
        print(f"Fatal error in analysis: {e}")

if __name__ == "__main__":
    main()
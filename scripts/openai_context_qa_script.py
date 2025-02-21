import os
import json
import pdfplumber
import tiktoken
from datetime import datetime
from openai_interface import OpenAIInterface

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

# Constants for text chunking
RESERVED_TOKENS = 1000  # Reserve tokens for question and response

def count_tokens(text):
    """Count the number of tokens in a text string."""
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))

def trim_text_to_token_limit(text, max_tokens):
    """Trim text to stay within token limit while trying to preserve complete sentences."""
    if count_tokens(text) <= max_tokens:
        return text
    
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    trimmed_tokens = tokens[:max_tokens]
    trimmed_text = encoding.decode(trimmed_tokens)
    
    # Try to end at a complete sentence
    last_period = trimmed_text.rfind('.')
    if last_period > max_tokens * 0.8:  # Only trim to sentence if we keep at least 80%
        trimmed_text = trimmed_text[:last_period + 1]
    
    return trimmed_text

def extract_key_sections(text):
    """Extract key sections from paper text."""
    # Look for common section indicators
    important_sections = [
        "ABSTRACT", "INTRODUCTION", "METHODOLOGY", "METHOD", 
        "RESULTS", "DISCUSSION", "CONCLUSION", "CONTRIBUTION"
    ]
    
    extracted_text = []
    current_section = []
    is_important = False
    
    for line in text.split('\n'):
        upper_line = line.upper()
        
        # Check if this line starts a new section
        if any(section in upper_line for section in important_sections):
            # Save previous section if it was important
            if current_section and is_important:
                extracted_text.append('\n'.join(current_section))
            # Start new section
            current_section = [line]
            is_important = True
        elif is_important:
            current_section.append(line)
    
    # Don't forget the last section
    if current_section and is_important:
        extracted_text.append('\n'.join(current_section))
    
    return '\n\n'.join(extracted_text) if extracted_text else text

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

def save_intermediate_results(results, output_file):
    """Save results with error handling"""
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved successfully to {output_file}")
    except Exception as e:
        print(f"Error saving results: {e}")

def analyze_context():
    """Analyze papers in context together."""
    model = OpenAIInterface()
    papers_dir = '../data/papers'
    output_file = 'data/openai_results/context_qa_results.json'
    papers_text = []
    
    print("\nLoading and processing papers...")
    
    # Calculate tokens per paper
    available_tokens = model.model_context_length - RESERVED_TOKENS
    tokens_per_paper = available_tokens // 3  # Divide available tokens among papers
    print(f"Allocating {tokens_per_paper} tokens per paper")
    
    # Load and process papers
    for i in range(1, 4):
        paper_path = os.path.join(papers_dir, f'paper-{i}.pdf')
        if os.path.exists(paper_path):
            print(f"Processing {paper_path}")
            text = extract_text_from_pdf(paper_path)
            if text:
                # First try to extract key sections
                key_sections = extract_key_sections(text)
                # Then trim to token limit
                trimmed_text = trim_text_to_token_limit(key_sections, tokens_per_paper)
                token_count = count_tokens(trimmed_text)
                print(f"Paper {i}: {token_count} tokens after processing")
                papers_text.append(f"=== Paper {i} ===\n{trimmed_text}")
    
    if not papers_text:
        print("Error: No papers were successfully loaded")
        return []
    
    results = []
    
    # Process questions
    for category, questions in CONTEXT_QUESTIONS.items():
        print(f"\nProcessing {category} questions...")
        for question in questions:
            print(f"Analyzing: {question}")
            
            combined_text = "\n\n".join(papers_text)
            prompt = f"""Analyze these research papers together and answer:
            {question}
            
            Please consider all papers in your analysis and provide specific examples.
            Focus on identifying connections, patterns, and relationships between the papers.
            
            Papers content:
            {combined_text}"""
            
            try:
                response = model.generate_response(prompt)
                result = {
                    'category': category,
                    'question': question,
                    'response': response,
                    'timestamp': datetime.now().isoformat()
                }
                results.append(result)
                
                # Save intermediate results
                save_intermediate_results(results, output_file)
                print(f"Successfully processed question: {question}")
                
            except Exception as e:
                print(f"Error with question '{question}': {e}")
                print(f"Token count of prompt: {count_tokens(prompt)}")
                results.append({
                    'category': category,
                    'question': question,
                    'response': None,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
                save_intermediate_results(results, output_file)
    
    return results

def main():
    print("Starting cross-paper context analysis...")
    results = analyze_context()
    
    if results:
        output_file = 'data/openai_results/context_qa_results.json'
        save_intermediate_results(results, output_file)
        print("\nAnalysis complete!")
    else:
        print("\nAnalysis failed to produce results")

if __name__ == "__main__":
    main()
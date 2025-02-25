import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

# generates a response using openAI's chat completion API by providing the user inputted query and the retrieved context
def generate_response(query, context_chunks): 
    # combine retrieved document chunks into one context string
    context_text = "\n\n".join([chunk["chunk"] for chunk in context_chunks])
    # make a prompt that has both the context and the user's query
    prompt = (
        f"Using the following context from academic documents:\n\n"
        f"{context_text}\n\n"
        f"Answer the following question concisely:\n{query}"
    )
    
    # chatcompletion endpoint with a system and user message
    messages = [
        {"role": "system", "content": "You are a knowledgeable academic assistant."},
        {"role": "user", "content": prompt}
    ]
    
    response = openai.chat.completions.create(
        model="gpt-4o",  
        messages=messages,
        max_tokens=300,
        temperature=0.7,
    )
    
    # get the reply
    answer = response.choices[0].message.content.strip()
    return answer

if __name__ == "__main__":
    # for testing and stuff:
    sample_query = "What are the latest advances in AI research?"
    sample_context = [{"chunk": "Sample academic content discussing recent breakthroughs in AI."}]
    print(generate_response(sample_query, sample_context))

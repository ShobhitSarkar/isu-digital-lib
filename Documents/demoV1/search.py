import pickle
import numpy as np
import faiss
import openai
import os
from dotenv import load_dotenv

load_dotenv(f"{os.getcwd()}\demoV1\key.env")
openai.api_key = os.getenv("OPENAI_API_KEY")

EMBEDDING_MODEL = "text-embedding-ada-002"
INDEX_FILE = "faiss_index.pkl"
MAPPING_FILE = "index_mapping.pkl"

def load_index_and_mapping():
    with open(INDEX_FILE, "rb") as f:
        index = pickle.load(f)
    with open(MAPPING_FILE, "rb") as f:
        mapping = pickle.load(f)
    return index, mapping

def get_embedding(text):
    response = openai.embeddings.create(  
        input=text,
        model=EMBEDDING_MODEL
    )
    embedding = response.data[0].embedding
    return np.array(embedding, dtype=np.float32)

# returns the top-k relevant document chunks for the given query
def search(query, k=5):
    index, mapping = load_index_and_mapping()
    query_embedding = get_embedding(query)
    query_embedding = np.expand_dims(query_embedding, axis=0)
    distances, indices = index.search(query_embedding, k)
    results = []
    for idx in indices[0]:
        results.append(mapping[idx])
    return results

if __name__ == "__main__":
    query = "Enter your query here"
    results = search(query)
    for res in results:
        print(f"Filename: {res['filename']}\nChunk: {res['chunk']}\n")

import os
import pickle
import numpy as np
import faiss
import openai
from tqdm import tqdm
from ingest import load_documents, chunk_text

openai.api_key = os.getenv("OPENAI_API_KEY")

EMBEDDING_MODEL = "text-embedding-ada-002"
INDEX_FILE = "faiss_index.pkl"
MAPPING_FILE = "index_mapping.pkl"

def get_embedding(text):
    response = openai.embeddings.create( 
        input=text,
        model=EMBEDDING_MODEL
    )
    embedding = embedding = response.data[0].embedding

    return np.array(embedding, dtype=np.float32)

def build_index(documents):
    all_embeddings = []
    mapping = []  # stores info about each chunk (filename and chunk text)
    for doc in tqdm(documents, desc="Processing documents"):
        chunks = chunk_text(doc["content"])
        for chunk in chunks:
            embedding = get_embedding(chunk)
            all_embeddings.append(embedding)
            mapping.append({"filename": doc["filename"], "chunk": chunk})
    embeddings_array = np.vstack(all_embeddings)
    dimension = embeddings_array.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings_array)
    return index, mapping

def save_index(index, mapping):
    with open(INDEX_FILE, "wb") as f:
        pickle.dump(index, f)
    with open(MAPPING_FILE, "wb") as f:
        pickle.dump(mapping, f)
    print("Index and mapping saved.")

def main():
    documents = load_documents()
    if not documents:
        print("No documents found in the 'documents' directory.")
        return
    index, mapping = build_index(documents)
    save_index(index, mapping)

if __name__ == "__main__":
    main()

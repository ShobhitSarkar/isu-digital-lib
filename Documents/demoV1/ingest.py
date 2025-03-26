import os
import PyPDF2

def load_pdf(file_path):
    text = ""
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return text

def load_txt(file_path):
    text = ""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            text = file.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return text

def load_documents(directory=f"{os.getcwd()}\demoV1\documents"):
    documents = []
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if filename.lower().endswith(".pdf"):
            content = load_pdf(file_path)
            documents.append({"filename": filename, "content": content})
        elif filename.lower().endswith(".txt"):
            content = load_txt(file_path)
            documents.append({"filename": filename, "content": content})
    return documents

def chunk_text(text, chunk_size=500, overlap=100):
    # splits text into chunks with the specified chunk_size and overlap.
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

if __name__ == "__main__":
    # you can run this file to test parsing of pdfs in the documents directory
    docs = load_documents()
    for doc in docs:
        print(f"Document: {doc['filename']} has {len(doc['content'])} characters")


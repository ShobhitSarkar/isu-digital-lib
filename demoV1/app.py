from search import search
from generate_response import generate_response

def main():
    print("Welcome to the Academic Document Semantic Search Demo")
    print("Type your query below (type 'exit' to quit):")
    while True:
        query = input("Your query: ")
        if query.lower() == "exit":
            break
        print("Searching for relevant document chunks...")
        results = search(query, k=5)
        print("Generating response using retrieved context...")
        answer = generate_response(query, results)
        print("\n--- Answer ---")
        print(answer)
        print("--------------\n")

if __name__ == "__main__":
    main()

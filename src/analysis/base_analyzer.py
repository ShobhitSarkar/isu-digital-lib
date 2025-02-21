from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime
import json
import os

class BaseAnalyzer(ABC):
    """Abstract base class for all analyzers"""
    
    def __init__(self, output_dir: str = 'data/results'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    @abstractmethod
    async def analyze_single_paper(self, paper_text: str, model) -> List[Dict[str, Any]]:
        """Analyze a single paper"""
        pass

    @abstractmethod
    async def analyze_papers(self, papers: List[str], model) -> Dict[str, List[Dict[str, Any]]]:
        """Analyze multiple papers"""
        pass

    def save_results(self, results: Dict[str, Any], filename: str):
        """Save analysis results to file"""
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {output_path}")

    def load_results(self, filename: str) -> Dict[str, Any]:
        """Load analysis results from file"""
        input_path = os.path.join(self.output_dir, filename)
        with open(input_path, 'r') as f:
            return json.load(f)

class BaseVectorAnalyzer(BaseAnalyzer):
    """Base class for vector-based analyzers"""
    
    def __init__(self, output_dir: str = 'data/results', chunk_size: int = 1000):
        super().__init__(output_dir)
        self.chunk_size = chunk_size
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks with overlap"""
        words = text.split()
        chunks = []
        overlap = 100  # Number of words to overlap
        
        for i in range(0, len(words), self.chunk_size - overlap):
            chunk = ' '.join(words[i:i + self.chunk_size])
            if len(chunk.strip()) > 0:
                chunks.append(chunk)
        
        return chunks
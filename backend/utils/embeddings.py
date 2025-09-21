from langchain_community.embeddings import HuggingFaceEmbeddings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_embeddings():
    """
    Initialize and return HuggingFace embeddings model.
    
    Returns:
        HuggingFaceEmbeddings: Initialized embeddings model or None if failed
    """
    try:
        logger.info("Initializing HuggingFace embeddings model...")
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        logger.info("HuggingFace embeddings model initialized successfully")
        return embeddings
    except Exception as e:
        logger.error(f"Error initializing embeddings: {e}")
        return None
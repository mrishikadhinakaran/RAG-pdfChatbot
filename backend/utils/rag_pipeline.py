from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.llms import HuggingFacePipeline
from transformers import pipeline
import logging
from .embeddings import get_embeddings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def build_vectorstore(text: str):
    """
    Build a FAISS vectorstore from text using HuggingFace embeddings.
    
    Args:
        text (str): Text to build vectorstore from
        
    Returns:
        FAISS: Vectorstore object or None if failed
    """
    try:
        if not text or not text.strip():
            logger.warning("Empty text provided for vectorstore creation")
            return None
            
        logger.info("Initializing text splitter...")
        # Use smaller chunk size for better context retrieval
        splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
        chunks = splitter.split_text(text)
        
        if not chunks:
            logger.warning("No chunks created from text")
            return None
            
        logger.info(f"Created {len(chunks)} chunks from text")
        
        logger.info("Initializing embeddings...")
        embeddings = get_embeddings()
        
        # Handle case where embeddings initialization failed
        if embeddings is None:
            logger.error("Failed to initialize embeddings")
            return None
            
        logger.info("Building FAISS vectorstore...")
        vectorstore = FAISS.from_texts(chunks, embeddings)
        logger.info("FAISS vectorstore built successfully")
        return vectorstore
    except Exception as e:
        logger.error(f"Error building vectorstore: {e}")
        return None

def get_llm(temperature: float = 0.1):
    """
    Initialize and return HuggingFace LLM.
    
    Args:
        temperature (float): Temperature for text generation (lower for more precise answers)
        
    Returns:
        HuggingFacePipeline: Initialized LLM or None if failed
    """
    try:
        logger.info(f"Initializing HuggingFace LLM with temperature {temperature}...")
        # Using a smaller, local model for better reliability
        pipe = pipeline(
            "text2text-generation",
            model="google/flan-t5-small",
            max_length=300,  # Increased max length for more detailed answers
            temperature=temperature
        )
        llm = HuggingFacePipeline(pipeline=pipe)
        logger.info("HuggingFace LLM initialized successfully")
        return llm
    except Exception as e:
        logger.error(f"Error initializing LLM: {e}")
        return None

def ask_question(vectorstore, query: str, temperature: float = 0.1):
    """
    Ask a question using the RAG pipeline with improved prompt engineering.
    
    Args:
        vectorstore: FAISS vectorstore containing document embeddings
        query (str): Question to ask
        temperature (float): Temperature for text generation (lower for more precise answers)
        
    Returns:
        str: Answer to the question
    """
    try:
        if not vectorstore:
            logger.warning("No vectorstore provided")
            return "No document has been processed yet. Please upload a PDF document first."
        
        logger.info(f"Processing query: {query}")
        logger.info("Retrieving relevant documents...")
        
        # Use a more precise retriever with higher k value for better context
        retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        docs = retriever.get_relevant_documents(query)
        
        if not docs:
            logger.warning("No relevant documents found for query")
            return "I couldn't find relevant information in the document to answer your question. Please try rephrasing or ask about content that might be in the document."
        
        logger.info(f"Retrieved {len(docs)} relevant documents")
        
        # Combine context from multiple documents with source indicators
        context_parts = []
        for i, doc in enumerate(docs):
            context_parts.append(f"Source {i+1}: {doc.page_content}")
        
        context = "\n\n".join(context_parts)
        logger.info(f"Retrieved context with {len(context)} characters from {len(docs)} documents")
        
        if not context.strip():
            logger.warning("Retrieved context is empty")
            return "The document doesn't contain relevant information to answer your question. Please try asking about different content."
        
        logger.info("Initializing LLM...")
        llm = get_llm(temperature)
        if not llm:
            logger.error("Failed to initialize LLM")
            return "Sorry, I'm having trouble processing your request right now. Please try again in a moment."
        
        # Improved prompt engineering for clearer answers
        prompt = f"""Use the following context to answer the question at the end. 
If you cannot answer the question based on the context, say "I cannot answer that question based on the provided document."
If the question is unrelated to the document content, say "That question is not related to the content of the uploaded document."

Context:
{context}

Question: {query}

Answer:"""
        
        logger.info("Generating response from LLM...")
        response = llm(prompt)
        logger.info("Response generated successfully")
        
        # Post-process the response for better clarity
        if response and response.strip():
            # Remove any generic model responses
            if response.strip().lower().startswith("i don't know") or response.strip().lower().startswith("i cannot"):
                return response.strip()
            
            # Ensure the response is relevant and clear
            return response.strip()
        else:
            logger.warning("LLM returned empty response")
            return "I couldn't generate a specific answer to your question based on the document. Please try rephrasing your question."
            
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        return f"I encountered an error while processing your question: {str(e)}. Please try rephrasing your question."
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
import logging
import asyncio
from utils.rag_pipeline import build_vectorstore, ask_question
from utils.pdf_processing import extract_text_from_pdf
import secrets

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Security
security = HTTPBasic()

# Allow CORS so frontend (localhost:5173) can talk to backend (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory user storage (in production, use a proper database)
users = {
    "admin": "admin123",  # username: password
    "user": "user123"
}

# Global variable to store the vectorstore
vectorstore = None

# Request model for chat
class ChatRequest(BaseModel):
    query: str
    temperature: Optional[float] = 0.1  # Lower default for more precise answers

# Response model for chat
class ChatResponse(BaseModel):
    response: str

# Request model for login
class LoginRequest(BaseModel):
    username: str
    password: str

# Response model for login
class LoginResponse(BaseModel):
    success: bool
    message: str

# Response model for upload status
class UploadStatus(BaseModel):
    filename: str
    status: str
    progress: Optional[int] = None
    stage: Optional[str] = None

# In-memory chat history (temporary storage)
chat_history: List[str] = []

def authenticate_user(credentials: HTTPBasicCredentials = Depends(security)):
    """Authenticate user with HTTP Basic Auth"""
    # In a real application, you would check against a database
    if credentials.username in users and users[credentials.username] == credentials.password:
        return credentials.username
    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Basic"},
    )

# ✅ Login Endpoint
@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint for user authentication.
    
    Args:
        request (LoginRequest): Contains username and password
        
    Returns:
        LoginResponse: Success status and message
    """
    logger.info(f"Login attempt for user: {request.username}")
    
    if request.username in users and users[request.username] == request.password:
        logger.info(f"Successful login for user: {request.username}")
        return {"success": True, "message": "Login successful"}
    else:
        logger.warning(f"Failed login attempt for user: {request.username}")
        return {"success": False, "message": "Invalid username or password"}

# ✅ Chat Endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, credentials: str = Depends(authenticate_user)):
    """
    Chat endpoint for asking questions about uploaded PDF documents.
    
    Args:
        request (ChatRequest): Contains the user's query and optional temperature setting
        credentials (str): Authenticated user
        
    Returns:
        ChatResponse: Contains the bot's response
    """
    user_query = request.query
    temperature = request.temperature if request.temperature is not None else 0.1
    logger.info(f"Received chat request from {credentials}: {user_query} with temperature {temperature}")
    
    # If we have a vectorstore, use RAG to answer the question
    if vectorstore:
        try:
            response_text = ask_question(vectorstore, user_query, temperature)
            # Ensure we always have a response
            if not response_text or response_text.strip() == "":
                response_text = "I couldn't find relevant information to answer your question."
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            response_text = f"Error processing query: {str(e)}"
    else:
        response_text = "Please upload a PDF document first."
    
    # Store in chat history
    chat_history.append(f"user ({credentials}): {user_query}")
    chat_history.append(f"bot: {response_text}")
    
    logger.info(f"Sending response: {response_text}")
    # Always return a response
    return {"response": response_text}

# ✅ File Upload Endpoint
@app.post("/upload", response_model=UploadStatus)
async def upload_file(
    file: UploadFile = File(...), 
    credentials: str = Depends(authenticate_user)
):
    """
    Upload and process a PDF file.
    
    Args:
        file (UploadFile): The uploaded PDF file
        credentials (str): Authenticated user
        
    Returns:
        UploadStatus: Status of the upload and processing
    """
    try:
        logger.info(f"Received file upload request from {credentials}: {file.filename}")
        
        # Validate file type
        if file.filename is None or not file.filename.endswith('.pdf'):
            logger.warning(f"Invalid file type uploaded: {file.filename}")
            return {"filename": file.filename or "unknown", "status": "Error: Only PDF files are allowed"}
        
        # Save uploaded file
        file_location = f"temp_{file.filename}"
        logger.info(f"Saving file to {file_location}")
        with open(file_location, "wb") as buffer:
            buffer.write(await file.read())
        
        # Process PDF and build vectorstore
        logger.info("Extracting text from PDF...")
        text = extract_text_from_pdf(file_location)
        
        if not text or not text.strip():
            logger.warning("No text extracted from PDF")
            os.remove(file_location)
            return {"filename": file.filename, "status": "Error: No text could be extracted from the PDF"}
        
        logger.info("Building vectorstore...")
        global vectorstore
        vectorstore = build_vectorstore(text)
        
        if vectorstore is None:
            logger.error("Failed to build vectorstore")
            os.remove(file_location)
            return {"filename": file.filename, "status": "Error: Failed to process the document"}
        
        # Clean up temporary file
        os.remove(file_location)
        logger.info("File processed successfully")
        
        return {"filename": file.filename, "status": "Uploaded and processed successfully"}
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        # Clean up temporary file if it exists
        file_location = f"temp_{file.filename}"
        if os.path.exists(file_location):
            os.remove(file_location)
        return {"filename": file.filename, "status": f"Error: {str(e)}"}

# ✅ History Endpoint
@app.get("/history")
async def get_history(credentials: str = Depends(authenticate_user)):
    """
    Get chat history.
    
    Args:
        credentials (str): Authenticated user
        
    Returns:
        dict: Chat history
    """
    logger.info(f"Returning chat history for {credentials}")
    # Filter history for this user in a real app
    return {"history": chat_history}

# ✅ Health Check Endpoint
@app.get("/")
async def root():
    """
    Health check endpoint.
    
    Returns:
        dict: Status message
    """
    logger.info("Health check endpoint called")
    return {"message": "✅ PDF Chatbot Backend is running 🚀"}

# ✅ Status Endpoint
@app.get("/status")
async def status(credentials: str = Depends(authenticate_user)):
    """
    Get the status of the application.
    
    Args:
        credentials (str): Authenticated user
        
    Returns:
        dict: Application status including whether a document is loaded
    """
    logger.info(f"Status endpoint called by {credentials}")
    return {
        "status": "running",
        "document_loaded": vectorstore is not None,
        "history_length": len(chat_history),
        "user": credentials
    }

# ✅ Document List Endpoint
@app.get("/documents")
async def list_documents(credentials: str = Depends(authenticate_user)):
    """
    List uploaded documents.
    
    Args:
        credentials (str): Authenticated user
        
    Returns:
        dict: List of documents
    """
    logger.info(f"Document list requested by {credentials}")
    # In a real application, this would return actual document metadata
    # For now, we'll return a placeholder
    return {
        "documents": [
            {
                "id": "1",
                "name": "sample-document.pdf",
                "size": 1024000,
                "uploadDate": "2023-01-01T12:00:00Z",
                "status": "completed"
            }
        ]
    }

# ✅ Delete Document Endpoint
@app.delete("/documents/{document_id}")
async def delete_document(document_id: str, credentials: str = Depends(authenticate_user)):
    """
    Delete a document.
    
    Args:
        document_id (str): ID of the document to delete
        credentials (str): Authenticated user
        
    Returns:
        dict: Success message
    """
    logger.info(f"Document deletion requested by {credentials} for document {document_id}")
    # In a real application, this would actually delete the document
    # For now, we'll just return a success message
    return {"message": f"Document {document_id} deleted successfully"}
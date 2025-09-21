# PDF-RAG Chatbot

A chatbot application that allows users to upload PDF documents and ask questions about their content using Retrieval-Augmented Generation (RAG).

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── utils/
│       ├── embeddings.py     # Embedding functions
│       ├── pdf_processing.py # PDF text extraction
│       └── rag_pipeline.py  # RAG implementation
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.tsx     # Main chat interface
│   │   │   └── Message.tsx  # Message component
│   │   ├── api.ts           # API helper functions
│   │   └── App.tsx          # Main application component
│   └── package.json         # Frontend dependencies
└── README.md
```

## Features

- Upload PDF documents (with file type and size validation)
- Ask questions about the content of uploaded PDFs
- Real-time chat interface with typing indicators
- RAG-based question answering with context retrieval
- Error handling and user feedback
- Chat history tracking
- Application status monitoring
- User authentication (HTTP Basic Auth)
- Document management with upload progress tracking
- Advanced settings for model configuration
- Detailed error messages and loading states
- Clear, precise answers based on document content
- Temperature control for answer precision

## Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   python -m uvicorn main:app --reload --port 8002
   ```

4. The backend will be running on `http://127.0.0.1:8002`

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The frontend will be running on `http://localhost:5176`

## Usage

1. Open your browser and navigate to `http://localhost:5176`
2. Login with demo credentials:
   - Admin: `admin` / `admin123`
   - User: `user` / `user123`
3. Upload a PDF document using the "Upload PDF" button
4. Wait for the document to be processed
5. Ask questions about the content of your document in the chat interface

## Deployment to GitHub

To deploy this project to GitHub:

1. Create a new repository on GitHub at https://github.com/new
   - Don't initialize with a README, .gitignore, or license
   - Name your repository (e.g., "pdf-chatbot")

2. Run the deployment script:
   ```bash
   ./deploy_to_github.sh
   ```

3. Follow the prompts to enter your GitHub username and repository name

Alternatively, you can manually deploy:
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## Improvements Made

1. Enhanced error handling throughout the application with user-friendly messages
2. Added comprehensive logging for debugging
3. Improved user feedback with detailed loading indicators and progress tracking
4. Added file validation (type and size) with clear error messages
5. Better API error handling with specific error types
6. Added application status endpoint
7. Improved code documentation
8. Implemented user authentication with HTTP Basic Auth
9. Enhanced document management with file listing and deletion
10. Added advanced settings panel with model configuration options
11. Implemented detailed progress indicators for long operations
12. Added document listing and deletion functionality
13. **Enhanced RAG pipeline for clearer, more precise answers**
14. **Added temperature control for answer precision**
15. **Improved prompt engineering for better context utilization**
16. **Optimized chunking strategy for better information retrieval**
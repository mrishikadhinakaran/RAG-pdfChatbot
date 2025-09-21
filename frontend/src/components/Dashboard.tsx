import React, { useState, useRef, useEffect } from "react";
import { sendMessage, uploadFile, getStatus, listDocuments, deleteDocument } from "../api";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Document {
  id: string;
  name: string;
  size: number;
  uploadDate: Date;
  status: "processing" | "completed" | "failed";
}

const Dashboard = () => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"chat" | "documents" | "settings">("chat");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [temperature, setTemperature] = useState<number>(() => {
    const saved = localStorage.getItem('pdf-chatbot-temperature');
    return saved ? parseFloat(saved) : 0.1;
  });
  const [model, setModel] = useState<string>(() => {
    const saved = localStorage.getItem('pdf-chatbot-model');
    return saved || "Flan-T5 Small";
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pdf-chatbot-darkMode');
    return saved === 'true';
  });
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('pdf-chatbot-temperature', temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('pdf-chatbot-model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('pdf-chatbot-darkMode', darkMode.toString());
  }, [darkMode]);

  // Load documents and status on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      // Load actual documents from backend
      const docsData = await listDocuments();
      if (docsData && docsData.documents) {
        const docs = docsData.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          size: doc.size,
          uploadDate: new Date(doc.uploadDate),
          status: doc.status
        }));
        setDocuments(docs);
      }
    } catch (error: any) {
      console.error("Error loading documents:", error);
      // Show user-friendly error message
      const errorMessage: MessageItem = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Error loading documents. Please refresh the page or check your connection.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const sendMessageToBackend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // Add user message to UI immediately
    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);
    setProcessingStage("Processing your question...");

    try {
      // Use the temperature setting from the settings panel
      const data = await sendMessage(inputValue, temperature);
      const response = data.response || "I couldn't process that request. Please try again.";
      
      // Add bot response to UI
      const botMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Error:", error);
      
      const errorMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error.message || "Error connecting to backend. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      const errorMessage: MessageItem = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Please upload a PDF file.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMessage: MessageItem = {
        id: Date.now().toString(),
        role: "assistant",
        content: "File size exceeds 10MB limit. Please upload a smaller file.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStage("Uploading document...");

    try {
      const result: any = await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // Add document to list
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        uploadDate: new Date(),
        status: "processing"
      };
      
      setDocuments(prev => [...prev, newDocument]);
      
      // Simulate processing stages
      setProcessingStage("Extracting text from PDF...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStage("Creating embeddings...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessingStage("Building vector store...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUploadProgress(100);
      setIsUploading(false);
      setProcessingStage("");
      
      // Update document status to completed
      setDocuments(prev => prev.map(doc => 
        doc.id === newDocument.id ? {...doc, status: "completed"} : doc
      ));
      
      let responseMessage: MessageItem;
      
      if (result.error) {
        responseMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.error,
          timestamp: new Date(),
        };
        // Update document status to failed
        setDocuments(prev => prev.map(doc => 
          doc.id === newDocument.id ? {...doc, status: "failed"} : doc
        ));
      } else if (result.status && result.status.includes("Error")) {
        responseMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.status,
          timestamp: new Date(),
        };
        // Update document status to failed
        setDocuments(prev => prev.map(doc => 
          doc.id === newDocument.id ? {...doc, status: "failed"} : doc
        ));
      } else {
        responseMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: `File ${result.filename} uploaded and processed successfully! You can now ask questions about the document.`,
          timestamp: new Date(),
        };
      }
      
      setMessages(prev => [...prev, responseMessage]);
      
      // Refresh document list
      loadDocuments();
    } catch (error: any) {
      setIsUploading(false);
      setProcessingStage("");
      
      const errorMessage: MessageItem = {
        id: Date.now().toString(),
        role: "assistant",
        content: error.message || "Error uploading file. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + formatTime(date);
  };

  // Function to delete a document
  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      const successMessage: MessageItem = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Document deleted successfully.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error: any) {
      const errorMessage: MessageItem = {
        id: Date.now().toString(),
        role: "assistant",
        content: error.message || "Error deleting document. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">PDF Chatbot</h1>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab("chat")}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "chat" 
                    ? "bg-blue-100 text-blue-600 font-medium" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Chat
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("documents")}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "documents" 
                    ? "bg-blue-100 text-blue-600 font-medium" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Documents
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === "settings" 
                    ? "bg-blue-100 text-blue-600 font-medium" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Settings
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <button
            onClick={triggerFileInput}
            disabled={isUploading}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isUploading 
                ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {activeTab}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <div className="flex flex-col h-full">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <div className="text-center max-w-md">
                      <h3 className="text-xl font-semibold mb-2">Welcome to PDF Chatbot</h3>
                      <p className="mb-4">Upload a PDF document and start asking questions!</p>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="font-medium mb-2">How to get clear answers:</p>
                        <ul className="text-left list-disc list-inside space-y-1 text-sm">
                          <li>Upload a PDF using the button in the sidebar</li>
                          <li>Ask specific questions about document content</li>
                          <li>Adjust temperature in Settings for precision</li>
                          <li>Get AI-powered answers based on your document</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            message.role === 'user' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}>
                            {message.role === 'user' ? 'U' : 'B'}
                          </div>
                          <div className={`rounded-2xl px-4 py-2 ${
                            message.role === 'user' 
                              ? 'bg-blue-500 text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                          }`}>
                            <p>{message.content}</p>
                            <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(isUploading || isProcessing) && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2 max-w-[80%]">
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-medium">
                            B
                          </div>
                          <div className="rounded-2xl px-4 py-2 bg-white text-gray-800 border border-gray-200 rounded-tl-none">
                            <div className="flex space-x-1 mb-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                            <p className="text-sm text-gray-600">{processingStage}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="flex items-center space-x-2 max-w-4xl mx-auto">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessageToBackend()}
                    disabled={isProcessing}
                    placeholder={isProcessing ? "Processing..." : "Ask a question about your document..."}
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessageToBackend}
                    disabled={isProcessing || !inputValue.trim()}
                    className={`p-2 rounded-full ${
                      isProcessing || !inputValue.trim()
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Uploaded Documents</h3>
                  <button
                    onClick={triggerFileInput}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    Upload Document
                  </button>
                </div>
                
                {(isUploading || processingStage) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                          <span>{processingStage || "Uploading document..."}</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        {processingStage && (
                          <p className="text-xs text-gray-500 mt-1">{processingStage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {documents.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-4 text-gray-600">No documents uploaded yet</p>
                    <button
                      onClick={triggerFileInput}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Upload Your First Document
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Document
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Upload Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatFileSize(doc.size)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatDate(doc.uploadDate)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                doc.status === "completed" 
                  ? "bg-green-100 text-green-800" 
                  : doc.status === "processing" 
                    ? "bg-yellow-100 text-yellow-800" 
                    : "bg-red-100 text-red-800"
              }`}>
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              <button 
                onClick={() => handleDeleteDocument(doc.id)}
                className="text-red-600 hover:text-red-900"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="p-4">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings</h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                      <select 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Flan-T5 Small">Flan-T5 Small</option>
                        <option value="Flan-T5 Base">Flan-T5 Base</option>
                        <option value="Flan-T5 Large">Flan-T5 Large</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500">
                        Larger models provide better accuracy but may be slower.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Answer Precision: {temperature}
                      </label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Precise (0.0)</span>
                        <span>Balanced (0.5)</span>
                        <span>Creative (1.0)</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Controls answer precision. Lower values provide more focused, deterministic answers.
                      </p>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="dark-mode"
                        checked={darkMode}
                        onChange={(e) => setDarkMode(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="dark-mode" className="ml-2 block text-sm text-gray-700">
                        Dark Mode
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                      <div className="flex">
                        <input 
                          type="password"
                          placeholder="Enter your API key"
                          className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-r-md text-sm font-medium text-gray-700">
                          Save
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Enter your API key for enhanced model capabilities.
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Account</h4>
                      <button className="text-sm text-red-600 hover:text-red-800 font-medium">
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Advanced Settings Section */}
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Advanced Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Size</label>
                      <input 
                        type="number"
                        defaultValue="300"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Size of text chunks for document processing (characters).
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Overlap</label>
                      <input 
                        type="number"
                        defaultValue="50"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Overlap between chunks to maintain context (characters).
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                      <input 
                        type="number"
                        defaultValue="300"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Maximum number of tokens in generated responses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useRef, useEffect } from "react";
import { sendMessage, uploadFile } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageToBackend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const newMessage: Message = { role: "user", content: inputValue };
    setMessages((prev: Message[]) => [...prev, newMessage]);
    setInputValue("");
    setIsProcessing(true);

    // Call backend API using the helper function with low temperature for precise answers
    try {
      const data = await sendMessage(inputValue, 0.1);
      const response = data.response || "I couldn't process that request. Please try again.";
      setMessages((prev: Message[]) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev: Message[]) => [...prev, { role: "assistant", content: "Error connecting to backend. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessages((prev: Message[]) => [...prev, { role: "assistant", content: "Please upload a PDF file." }]);
      return;
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessages((prev: Message[]) => [...prev, { role: "assistant", content: "File size exceeds 10MB limit. Please upload a smaller file." }]);
      return;
    }

    setIsUploading(true);

    try {
      const result: any = await uploadFile(file);
      setIsUploading(false);
      
      if (result.error) {
        setMessages((prev: Message[]) => [...prev, { role: "assistant", content: result.error }]);
      } else if (result.status && result.status.includes("Error")) {
        setMessages((prev: Message[]) => [...prev, { role: "assistant", content: result.status }]);
      } else {
        setMessages((prev: Message[]) => [...prev, { role: "assistant", content: `File ${result.filename} uploaded and processed successfully! You can now ask questions about the document.` }]);
      }
    } catch (error) {
      setIsUploading(false);
      setMessages((prev: Message[]) => [...prev, { role: "assistant", content: "Error uploading file. Please try again." }]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 text-center">
        <div className="font-semibold text-lg">PDF Chatbot</div>
        <div className="mt-2">
          <button
            onClick={triggerFileInput}
            disabled={isUploading}
            className={`px-4 py-2 rounded-lg text-sm ${
              isUploading 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-500"
            }`}>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-xl font-semibold mb-4">Welcome to PDF Chatbot!</p>
            <p className="mb-2">Upload a PDF document and start asking questions!</p>
            <p className="text-sm">The chatbot will provide clear, precise answers based on your document content.</p>
            <div className="mt-6 p-4 bg-gray-800 rounded-lg max-w-md mx-auto text-left">
              <p className="font-semibold mb-2">How to get clear answers:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click "Upload PDF" to upload a document</li>
                <li>Ask specific questions about document content</li>
                <li>Get precise answers based on your document</li>
                <li>Rephrase if you don't get a clear answer</li>
              </ol>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg max-w-xl ${
                msg.role === "user"
                  ? "ml-auto bg-green-600"
                  : "mr-auto bg-gray-700"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        {(isUploading || isProcessing) && (
          <div className="mr-auto bg-gray-700 p-3 rounded-lg max-w-xl">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse delay-75"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 flex items-center">
        <input
          className="flex-1 p-3 rounded-lg bg-gray-800 text-white outline-none"
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          placeholder={isProcessing ? "Processing..." : "Ask a question about your document..."}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && sendMessageToBackend()}
          disabled={isProcessing}
        />
        <button
          className={`ml-2 px-4 py-2 rounded-lg ${
            isProcessing 
              ? "bg-gray-600 cursor-not-allowed" 
              : "bg-green-600 hover:bg-green-500"
          }`}
          onClick={sendMessageToBackend}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chat;
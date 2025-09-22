// For development, use the local backend server
// For production (Vercel), use relative paths since frontend and backend are served from the same domain
const API_BASE = '';

// Store authentication token
let authToken: string | null = null;

// Set authentication token
export function setAuthToken(token: string | null) {
  authToken = token;
}

// Get authentication token
export function getAuthToken() {
  return authToken;
}

// Enhanced error handling with more detailed messages
export async function sendMessage(message: string, temperature: number = 0.1) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(authToken && { "Authorization": `Basic ${authToken}` })
      },
      body: JSON.stringify({ query: message, temperature }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status === 404) {
        throw new Error("Service not found. Please check if the backend server is running.");
      } else if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return { response: data.response };
  } catch (error: any) {
    console.error("Error sending message:", error);
    
    // More user-friendly error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { response: "Connection failed. Please check if the backend server is running and accessible." };
    } else if (error.message) {
      return { response: error.message };
    } else {
      return { response: "An unexpected error occurred. Please try again." };
    }
  }
}

// Enhanced upload with progress tracking
export async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Use fetch with progress tracking
    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: {
        ...(authToken && { "Authorization": `Basic ${authToken}` })
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status === 413) {
        throw new Error("File too large. Please upload a smaller file.");
      } else {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error uploading file:", error);
    
    // More user-friendly error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: "Connection failed. Please check if the backend server is running and accessible." };
    } else if (error.message) {
      return { error: error.message };
    } else {
      return { error: "File upload failed. Please try again." };
    }
  }
}

export async function login(username: string, password: string) {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid username or password.");
      } else if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    if (data.success) {
      // Store base64 encoded credentials for basic auth
      const token = btoa(`${username}:${password}`);
      setAuthToken(token);
    }
    return data;
  } catch (error: any) {
    console.error("Login error:", error);
    
    // More user-friendly error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, message: "Connection failed. Please check if the backend server is running and accessible." };
    } else if (error.message) {
      return { success: false, message: error.message };
    } else {
      return { success: false, message: "Login failed. Please check your credentials." };
    }
  }
}

export async function getStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`, {
      headers: {
        ...(authToken && { "Authorization": `Basic ${authToken}` })
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status === 404) {
        throw new Error("Service not found. Please check if the backend server is running.");
      } else if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error fetching status:", error);
    
    // More user-friendly error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return null;
    } else {
      return null;
    }
  }
}

// New function to list documents
export async function listDocuments() {
  try {
    const response = await fetch(`${API_BASE}/documents`, {
      headers: {
        ...(authToken && { "Authorization": `Basic ${authToken}` })
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`Document list failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    throw error;
  }
}

// New function to delete a document
export async function deleteDocument(documentId: string) {
  try {
    const response = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: "DELETE",
      headers: {
        ...(authToken && { "Authorization": `Basic ${authToken}` })
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`Document deletion failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error deleting document:", error);
    throw error;
  }
}
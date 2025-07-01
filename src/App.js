// src/App.js - Simplified version that uses the backend-connected component
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ResearchTodoApp from './components/ResearchTodoApp'; // Your updated backend-connected component

function App() {
  return (
      <AuthProvider>
        <ProtectedRoute>
          <ResearchTodoApp />
        </ProtectedRoute>
      </AuthProvider>
  );
}

export default App;
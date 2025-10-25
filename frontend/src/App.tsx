import { useEffect } from "react";
import "./index.css";
import { useAuthState, checkAuth } from "./state/authState";
import { Login } from "./components/Login";
import { ChatPage } from "./pages/ChatPage";

export function App() {
  const authState = useAuthState();

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (authState.loading) {
    return (
      <div className="app-loading">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!authState.user) {
    return <Login />;
  }

  // Show main app if authenticated
  return <ChatPage />;
}

export default App;

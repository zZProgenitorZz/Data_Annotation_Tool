import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../components/AuthContext";

export default function PublicOnlyRoute({ children }) {
  const { currentUser, loading } = useContext(AuthContext);

  if (loading) return null;

  if (currentUser) {
    // already logged in -> never see /login again
    return <Navigate to="/overview" replace />;
  }

  return children;
}

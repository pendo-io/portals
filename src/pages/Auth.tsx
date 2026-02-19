import { Navigate } from "react-router-dom";

// Legacy route — redirect to the new /login page
const Auth = () => <Navigate to="/login" replace />;

export default Auth;

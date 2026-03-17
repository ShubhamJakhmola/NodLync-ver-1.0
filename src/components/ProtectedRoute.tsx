import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAppStore from "../store/useAppStore";

const ProtectedRoute = () => {
  const user = useAppStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

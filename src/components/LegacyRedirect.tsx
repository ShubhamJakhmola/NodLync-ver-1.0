import { Navigate, useParams } from "react-router-dom";

export default function LegacyRedirect({ template }: { template: string }) {
  const params = useParams();
  const to = template.replace(/:([A-Za-z0-9_]+)/g, (_, key) => encodeURIComponent(String((params as any)[key] ?? "")));
  return <Navigate to={to} replace />;
}


import DashboardOverview from "../modules/dashboard/DashboardOverview";
import { useSeo } from "../hooks/useSeo";

const DashboardPage = () => {
  useSeo("Dashboard");
  return <DashboardOverview />;
};

export default DashboardPage;

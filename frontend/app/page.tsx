import DashboardChart from '../components/DashboardChart';

export default function HomePage() {
  return (
    <div>
      <h1>NDTC Campaign Tracker Dashboard</h1>
      <p>
        Welcome! Use the navigation above to manage candidates, volunteers, events, and attendances.
      </p>
      <h2>Campaign Metrics Over Time</h2>
      <DashboardChart />
    </div>
  );
}

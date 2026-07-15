import { RootGate } from "@/components/root-gate";

// The actual SubTrack AI application (client-rendered).
// This is where users sign in and use the app.
// The root URL (/) shows a server-rendered landing page for Google verification.
export default function AppPage() {
  return <RootGate />;
}

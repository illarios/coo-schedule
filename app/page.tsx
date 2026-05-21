import { redirect } from "next/navigation";

// Middleware handles auth — root just redirects to schedule
export default function Home() {
  redirect("/schedule");
}

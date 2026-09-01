import { useEffect, useState } from "react";
import BookingApp from "./components/BookingApp.tsx";
import AdminApp from "./components/AdminApp.tsx";

export default function App() {
  const [route, setRoute] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (route.startsWith("/admin")) {
    return <AdminApp />;
  }

  if (route.startsWith("/book")) {
    return <BookingApp />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0c0c0c" }}
    >
      <div className="text-center max-w-lg px-6">
        <h1
          className="text-3xl font-extrabold tracking-tight mb-2"
          style={{ color: "#f4f4f4" }}
        >
          ClearSmile Dental
        </h1>
        <p className="text-sm mb-8" style={{ color: "#8a8a8a" }}>
          Patient Reactivation System
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/admin"
            className="rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all"
            style={{ background: "#f5a623", color: "#0c0c0c" }}
          >
            Admin Dashboard
          </a>
          <a
            href="/book"
            className="rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider border transition-all"
            style={{ borderColor: "#2a2a2a", color: "#f4f4f4" }}
          >
            Book Appointment
          </a>
        </div>
      </div>
    </div>
  );
}
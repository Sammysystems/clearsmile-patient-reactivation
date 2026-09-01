import { useState, type ReactNode } from "react";
import { ChevronDown, Check, Calendar, MessageCircle } from "lucide-react";

interface BookingSlot {
  date: string;
  label: string;
  times: string[];
}

const SERVICES = [
  "Check-up & Clean",
  "Cleaning & Polish",
  "Teeth Whitening",
  "Clear Aligners Consult",
  "Emergency",
];

export default function BookingApp() {
  const [mode, setMode] = useState<"book" | "question">("book");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { type: string; name: string; date?: string; time?: string }>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");

  const loadSlots = async () => {
    setLoading(true);
    setSelectedDate("");
    setSelectedTime("");
    try {
      const res = await fetch("/api/booking/slots");
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const submitBooking = async () => {
    if (!name.trim() || !email.trim() || !selectedDate || !selectedTime) {
      setError("Please fill in your details and pick a time.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/webhook/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, date: selectedDate, time: selectedTime, service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setDone({
        type: "book",
        name: name.trim().split(" ")[0],
        date: selectedDate,
        time: selectedTime,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuestion = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    if (!question.trim()) {
      setError("Please write your question so our team can help.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/webhook/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: question, service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Message failed");
      setDone({ type: "question", name: name.trim().split(" ")[0] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <BookingSuccess done={done} />;
  }

  return (
    <div className="min-h-screen" style={{ background: "#0c0c0c" }}>
      <BrandHeader />

      <main className="max-w-7xl mx-auto px-6 md:px-16 py-12 lg:py-16">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-10">
          <button
            onClick={() => setMode("book")}
            className="px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all"
            style={
              mode === "book"
                ? { background: "#f5a623", color: "#0c0c0c" }
                : { border: "1px solid #2a2a2a", color: "#8a8a8a" }
            }
          >
            Book an Appointment
          </button>
          <button
            onClick={() => setMode("question")}
            className="px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all"
            style={
              mode === "question"
                ? { background: "#f5a623", color: "#0c0c0c" }
                : { border: "1px solid #2a2a2a", color: "#8a8a8a" }
            }
          >
            I Have a Question
          </button>
        </div>

        <div className="grid lg:grid-cols-10 gap-10 lg:gap-14 items-start">
          {/* Left: info */}
          <div className="lg:col-span-4">
            <span
              className="text-xs font-semibold tracking-[0.12em] uppercase block mb-4"
              style={{ color: "#8a8a8a" }}
            >
              {mode === "book" ? "BOOK YOUR APPOINTMENT" : "TALK TO OUR TEAM"}
            </span>
            <h2
              className="text-3xl sm:text-[38px] font-extrabold tracking-[-0.02em] leading-[1.15] mb-8"
              style={{ color: "#f4f4f4" }}
            >
              {mode === "book"
                ? "Ready for a Smile You're Proud Of?"
                : "Have a Question? We're Here."}
            </h2>

            <div className="flex flex-col gap-4">
              {[
                "Gentle, judgment-free care",
                "Saturday and evening appointments",
                "Confirmation and reminders by email",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3.5">
                  <span
                    className="w-[22px] h-[22px] border-[1.5px] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ borderColor: "#f5a623", color: "#f5a623" }}
                  >
                    ✓
                  </span>
                  <span className="text-[15px]" style={{ color: "#f4f4f4" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-6">
            <div
              className="rounded-2xl p-8 md:p-10"
              style={{
                background: "#141414",
                border: "1px solid #2a2a2a",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              }}
            >
              <Field label="Your Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="input-base"
                />
              </Field>

              <Field label="Email Address">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="input-base"
                />
              </Field>

              <Field label="Service">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setServiceOpen(!serviceOpen)}
                    className="input-base w-full flex items-center justify-between text-left"
                  >
                    <span>{service}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${serviceOpen ? "rotate-180" : ""}`}
                      style={{ color: "#f5a623" }}
                    />
                  </button>
                  {serviceOpen && (
                    <div
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-30 rounded-lg overflow-hidden py-1.5"
                      style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
                    >
                      {SERVICES.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setService(opt);
                            setServiceOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-[15px] flex items-center justify-between transition-colors hover:bg-white/[0.06]"
                          style={{ color: service === opt ? "#f5a623" : "#f4f4f4" }}
                        >
                          <span>{opt}</span>
                          {service === opt && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              {mode === "book" && (
                <>
                  <Field label="Pick a Day & Time" hint="Click to load available slots">
                    <button
                      type="button"
                      onClick={loadSlots}
                      className="btn-primary w-full justify-center"
                    >
                      <Calendar className="w-4 h-4" />
                      {loading ? "Loading slots…" : "Show Available Times"}
                    </button>
                  </Field>

                  {slots.length > 0 && (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {slots.map((slot) => (
                        <div key={slot.date}>
                          <button
                            onClick={() => {
                              setSelectedDate(slot.date);
                              setSelectedTime("");
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                              selectedDate === slot.date
                                ? "border-[#f5a623]"
                                : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                            }`}
                            style={{ background: "#1c1c1c" }}
                          >
                            <span className="text-[13px] font-semibold block mb-2" style={{ color: "#f4f4f4" }}>
                              {slot.label}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {slot.times.map((t) => (
                                <span
                                  key={t}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(slot.date);
                                    setSelectedTime(t);
                                  }}
                                  className={`px-2 py-1 rounded-md text-[11px] cursor-pointer transition-all select-none ${
                                    selectedDate === slot.date && selectedTime === t
                                      ? "text-[#0c0c0c] font-bold"
                                      : "hover:border-[#f5a623]/60"
                                  }`}
                                  style={
                                    selectedDate === slot.date && selectedTime === t
                                      ? { background: "#f5a623" }
                                      : { background: "#0c0c0c", border: "1px solid #2a2a2a", color: "#8a8a8a" }
                                  }
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {mode === "question" && (
                <Field label="Your Question" hint="A real person from our front desk will reply by email.">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                    placeholder="Ask us anything about treatments, pricing, payment plans…"
                    className="input-base w-full resize-none"
                  />
                </Field>
              )}

              {error && (
                <p className="mt-4 text-sm" style={{ color: "#e05555" }}>
                  {error}
                </p>
              )}

              <button
                onClick={mode === "book" ? submitBooking : submitQuestion}
                disabled={submitting}
                className="btn-primary w-full justify-center mt-6"
              >
                {mode === "book" ? (
                  submitting ? "Booking…" : "Confirm My Appointment"
                ) : submitting ? "Sending…" : "Send My Question"}
              </button>

              <p className="text-center text-[13px] mt-4" style={{ color: "#555555" }}>
                No spam. Confirmation and reminders go straight to your email.
              </p>
            </div>
          </div>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <label className="block text-sm font-medium" style={{ color: "#8a8a8a" }}>
          {label}
        </label>
        {hint && <span className="text-[11px]" style={{ color: "#555555" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function BookingSuccess({ done }: { done: { type: string; name: string; date?: string; time?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0c0c0c" }}>
      <div
        className="max-w-md w-full text-center rounded-2xl p-10"
        style={{ background: "#141414", border: "1px solid #2a2a2a" }}
      >
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)" }}
        >
          <Check className="w-8 h-8" style={{ color: "#4ade80" }} />
        </div>
        <h2 className="text-2xl font-extrabold mb-3" style={{ color: "#f4f4f4" }}>
          {done.type === "book" ? "You're Booked!" : "Message Received!"}
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#8a8a8a" }}>
          {done.type === "book" ? (
            <>
              Thank you, <strong style={{ color: "#f4f4f4" }}>{done.name}</strong>. Your
              appointment is confirmed. A confirmation email is on its way.
            </>
          ) : (
            <>
              Thank you, <strong style={{ color: "#f4f4f4" }}>{done.name}</strong>. Our front desk
              team will reply to you by email — usually within a couple of hours during open hours.
            </>
          )}
        </p>
        <div
          className="rounded-lg p-4 mb-6"
          style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }}
        >
          {done.type === "book" ? (
            <>
              <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#f5a623" }}>
                Appointment Details
              </p>
              <p className="text-sm font-semibold" style={{ color: "#f4f4f4" }}>
                {done.date}
              </p>
              <p className="text-sm font-semibold" style={{ color: "#f4f4f4" }}>
                {done.time}
              </p>
            </>
          ) : (
            <MessageCircle className="w-6 h-6 mx-auto" style={{ color: "#f5a623" }} />
          )}
        </div>
        <a
          href="/book"
          className="text-sm font-semibold underline underline-offset-4"
          style={{ color: "#f5a623" }}
        >
          Book another appointment
        </a>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <header className="border-b border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-6 md:px-16 py-6 flex items-center justify-between">
        <div className="flex flex-col items-start select-none">
          <span className="text-white font-bold text-lg md:text-xl tracking-tight leading-none">
            ClearSmile Dental
          </span>
          <svg className="w-20 h-1.5 mt-1 text-[#F5A623]" viewBox="0 0 60 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2C15 5 45 5 58 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <SearchDemoBadge />
      </div>
    </header>
  );
}

function SearchDemoBadge() {
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
      style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", color: "#f5a623" }}
    >
      Patient Portal
    </span>
  );
}

function BrandFooter() {
  return (
    <footer className="border-t border-[#1c1c1c] py-8">
      <div className="max-w-7xl mx-auto px-6 md:px-16 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: "#555555" }}>
          © {new Date().getFullYear()} ClearSmile Dental. All rights reserved.
        </p>
        <p className="text-[13px]" style={{ color: "#555555" }}>
          Gentle care, every visit.
        </p>
      </div>
    </footer>
  );
}
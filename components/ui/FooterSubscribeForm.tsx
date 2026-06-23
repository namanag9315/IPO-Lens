"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

export default function FooterSubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/email/subscribe", {
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Subscription failed.");
      }

      setEmail("");
      setStatus("success");
      setMessage("You are subscribed.");
    } catch {
      setStatus("error");
      setMessage("Could not subscribe right now.");
    }
  }

  return (
    <form className="footer-subscribe-form" onSubmit={handleSubmit}>
      <label htmlFor="footer-email">Email updates</label>
      <div>
        <Mail size={15} />
        <input
          disabled={status === "loading"}
          id="footer-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          type="email"
          value={email}
        />
        <button disabled={status === "loading"} type="submit">
          {status === "loading" ? "..." : <ArrowRight size={15} />}
        </button>
      </div>
      {status === "success" ? (
        <p className="footer-subscribe-success"><CheckCircle2 size={13} /> {message}</p>
      ) : null}
      {status === "error" ? <p className="footer-subscribe-error">{message}</p> : null}
    </form>
  );
}

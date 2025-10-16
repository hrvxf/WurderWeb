"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/Button";

export default function ContactPage() {
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleCardClick = (selectedReason: string) => {
    setReason(selectedReason);
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="relative flex flex-col bg-transparent min-h-screen">
      {/* Animated Background */}
      <canvas id="animated-bg-canvas" className="absolute top-0 left-0 w-full h-full -z-10"></canvas>

      {/* Main content container */}
      <main className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Left: Contact Form */}
          <motion.form
            id="contact-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full space-y-6 rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl sm:p-8"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                Let&apos;s connect
              </p>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Contact Us</h2>
              <p className="text-base text-gray-700">
                Share a few details and we&apos;ll follow up within 1–2 business days.
              </p>
            </div>
            {submitted ? (
              <p className="text-green-700 text-center text-lg">
                Thank you for reaching out! We’ll get back to you soon.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-900">Name</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-gray-300 bg-white p-3 text-base text-gray-900 shadow-inner transition focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-900">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-gray-300 bg-white p-3 text-base text-gray-900 shadow-inner transition focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-900">Reason</label>
                  <select
                    className="w-full rounded-2xl border border-gray-300 bg-white p-3 text-base text-gray-900 shadow-inner transition focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  >
                    <option value="">Select a reason</option>
                    <option value="Support">Support</option>
                    <option value="Business">Business</option>
                    <option value="Press">Press</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-900">Message</label>
                  <textarea
                    className="w-full min-h-[160px] rounded-2xl border border-gray-300 bg-white p-3 text-base text-gray-900 shadow-inner transition focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" fullWidth className="text-base font-semibold">
                  Send Message
                </Button>
              </>
            )}
            <div className="border-t border-white/50 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Need something quick?</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>
                  Email us directly at
                  <a className="ml-1 font-semibold text-yellow-700 hover:text-yellow-800" href="mailto:hello@wurder.com">
                    hello@wurder.com
                  </a>
                </li>
                <li>Call our support line at (555) 012-3456, Monday – Friday, 9am to 6pm ET.</li>
              </ul>
            </div>
          </motion.form>

          {/* Right: Hero + Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex w-full flex-col"
          >
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              Get in Touch
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
              Questions, feedback, or collaboration ideas? We’d love to hear from you.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                { title: "Support", desc: "Need help with the app or game setup?", reason: "Support" },
                { title: "Business", desc: "Partnerships, licensing, or events.", reason: "Business" },
                { title: "Press", desc: "Press inquiries and media requests.", reason: "Press" },
              ].map((card, idx) => (
                <motion.div
                  key={card.title}
                  onClick={() => handleCardClick(card.reason)}
                  whileHover={{ scale: 1.03 }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group cursor-pointer rounded-3xl border border-white/40 bg-white/40 p-6 shadow-lg backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">{card.title}</h3>
                  <p className="mt-2 text-sm text-gray-700 sm:text-base">{card.desc}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-yellow-700 transition group-hover:text-yellow-800">
                    Choose this option →
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 rounded-3xl border border-white/30 bg-white/20 p-6 backdrop-blur-lg">
              <h2 className="text-lg font-semibold text-white sm:text-xl">Prefer self-service?</h2>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Explore our FAQ and resource hub for quick answers to common questions, tutorials, and troubleshooting guides.
              </p>
              <Button href="/support" className="mt-4 w-full sm:w-auto">
                Visit Help Center
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

    </div>
  );
}

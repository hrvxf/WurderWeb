"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
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

  const handleSubmit = (e: any) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col relative bg-transparent">
      {/* Animated Background */}
      <canvas id="animated-bg-canvas" className="absolute top-0 left-0 w-full h-full -z-10"></canvas>

      {/* Main content container */}
      <main className="max-w-6xl mx-auto px-6 py-8 my-8">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Left: Contact Form */}
          <motion.form
            id="contact-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/30 backdrop-blur-md p-8 rounded-2xl shadow-lg space-y-5 w-full md:w-1/2 max-w-md"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
            {submitted ? (
              <p className="text-green-700 text-center text-lg">
                Thank you for reaching out! We’ll get back to you soon.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-gray-900 font-medium mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 bg-white text-gray-900 shadow-inner"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 bg-white text-gray-900 shadow-inner"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-medium mb-1">Reason</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 bg-white text-gray-900 shadow-inner"
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
                <div>
                  <label className="block text-gray-900 font-medium mb-1">Message</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 bg-white text-gray-900 shadow-inner"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" fullWidth>
                  Send Message
                </Button>
              </>
            )}
          </motion.form>

          {/* Right: Hero + Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">Get in Touch</h1>
            <p className="text-lg text-white/90 mb-8 max-w-lg">
              Questions, feedback, or collaboration ideas? We’d love to hear from you.
            </p>
            <div className="flex flex-col gap-6">
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
                  className="cursor-pointer p-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition"
                >
                  <h3 className="text-2xl font-semibold mb-3 text-gray-900">{card.title}</h3>
                  <p className="text-gray-700">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

    </div>
  );
}

"use client";

import Image from "next/image";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative bg-transparent text-gray-900 scroll-smooth">
      {/* Animated Background Canvas */}
      <canvas id="animated-bg-canvas" className="absolute top-0 left-0 w-full h-full -z-10" />

      {/* Hero Section */}
      <main className="flex-grow bg-white/30 backdrop-blur-md rounded-2xl mx-4 md:mx-12 my-8 p-8 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-16">
          <div className="md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 drop-shadow-lg">
              The social deduction murder game that makes every gathering unforgettable.
            </h1>
            <p className="text-lg text-gray-800 mb-6">
              From casual nights to big events — bring people together with a game they’ll talk about long after it ends.
            </p>
            <Button
              href="/download"
              className="bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition"
            >
              Download the App
            </Button>
          </div>
          <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
            <Image
              src="/hero-image.png"
              alt="Hero Image"
              width={1200}
              height={1200}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section
        id="features"
        className="bg-white/30 backdrop-blur-md rounded-2xl mx-4 md:mx-12 my-8 py-16 shadow-lg"
      >
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 drop-shadow-lg">
            Why Wurder?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Set Up in Minutes",
                desc: "No complicated prep. Build a custom game in minutes and get everyone playing.",
                icon: "⚡",
              },
              {
                title: "For Any Group Size",
                desc: "Whether it’s a small gathering or a large scale event, Wurder is designed to bring people together.",
                icon: "👥",
              },
              {
                title: "Play Anywhere",
                desc: "Perfect for living rooms, parties, or big venues. The Wurder app keeps the game running smoothly wherever you are.",
                icon: "🎯",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/30 backdrop-blur-md rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-700">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import Image from "next/image";
import Button from "@/components/Button";
import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onLoginClick?: () => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [shrinkHeader, setShrinkHeader] = useState(false);
  const [user] = useAuthState(auth);
  const router = useRouter();

  let closeTimeout: NodeJS.Timeout;

  const handleDropdownEnter = () => {
    clearTimeout(closeTimeout);
    setAccountDropdown(true);
  };

  const handleDropdownLeave = () => {
    closeTimeout = setTimeout(() => setAccountDropdown(false), 200); // 200ms delay
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Features", href: "#features" },
    { name: "Contact", href: "/contact" },
    { name: "Play", href: "/buy" },
    { name: "Download", href: "/download" },
  ];

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("section[id]");
    const handleScroll = () => {
      let current = "";
      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 120;
        if (window.scrollY >= sectionTop) {
          current = section.getAttribute("id") || "";
        }
      });
      setActiveSection(current);
      setShrinkHeader(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md bg-white/10 border-b border-orange-400/30 shadow-md transition-all duration-300 ${
        shrinkHeader ? "py-0 shadow-lg" : "py-3"
      }`}
    >
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6">
        {/* Logo */}
        <a href="/" className="flex items-center space-x-3">
          <Image
            src="/wurder-logo3.png"
            alt="Wurder"
            width={shrinkHeader ? 170 : 200}
            height={58}
            className="object-contain transition-all duration-300 hover:scale-105"
            priority
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6 text-md font-semibold text-yellow-100 tracking-wide">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`relative px-3 py-1 transition duration-200 group ${
                activeSection === item.href.replace("#", "")
                  ? "text-orange-400 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-orange-400 after:rounded-full"
                  : "hover:text-orange-400"
              }`}
            >
              <span className="relative z-10">{item.name}</span>
              <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-orange-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        {/* Right-side button */}
        {!user ? (
          <Button
            onClick={() => onLoginClick?.()}
            className="hidden md:block ml-4 bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow-lg"
          >
            Login
          </Button>
        ) : (
          <div
            className="relative hidden md:block ml-4"
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-5 py-2 rounded-lg shadow-lg"
            >
              My Account
            </button>
            {accountDropdown && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white/90 border border-gray-200 rounded-lg shadow-lg z-50"
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg"
                >
                  View Profile
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-b-lg"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-yellow-100 hover:text-orange-400 transition p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-gradient-to-br from-[#2b0f3f] to-[#4d1a1a] border-t border-orange-400/20 shadow-xl px-6 py-5 space-y-4 animate-fadeIn text-yellow-100">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`block text-lg transition ${
                activeSection === item.href.replace("#", "")
                  ? "text-orange-400 underline underline-offset-4"
                  : "hover:text-orange-400"
              }`}
            >
              {item.name}
            </a>
          ))}
          {!user ? (
            <Button
              onClick={() => onLoginClick?.()}
              fullWidth
              className="bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 text-white shadow-lg"
            >
              Login
            </Button>
          ) : (
            <div className="space-y-2">
              <a
                href="/profile"
                className="block bg-gray-800 hover:bg-gray-900 text-white text-center py-3 rounded-lg shadow-lg"
              >
                My Account
              </a>
              <button
                onClick={handleSignOut}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg shadow-lg cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

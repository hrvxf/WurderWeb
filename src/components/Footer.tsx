export default function Footer() {
  return (
    <footer className="bg-white/30 backdrop-blur-md border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center py-6 px-6 text-gray-600 text-sm">
        <div>© 2025 Wurder</div>
        <div className="space-x-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-gray-800 transition-colors">
            About
          </a>
          <a href="#" className="hover:text-gray-800 transition-colors">
            Privacy Policy
          </a>
          <a href="/contact" className="hover:text-gray-800 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

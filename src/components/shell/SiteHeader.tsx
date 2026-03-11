import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/members", label: "Members" },
  { href: "/contact", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-md">
      <div className="page-wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image src="/wurder_gold.png" alt="Wurder" width={156} height={44} priority />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-soft md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button href="/login" variant="ghost">
            Sign In
          </Button>
          <Button href="/join" variant="glass">
            Join a Game
          </Button>
        </div>
      </div>
    </header>
  );
}

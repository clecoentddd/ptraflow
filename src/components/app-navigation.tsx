"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Home, 
  ShieldCheck, 
  FileText, 
  Calculator, 
  Gavel, 
  CreditCard 
} from "lucide-react";

const navItems = [
  {
    title: "Accueil",
    href: "/",
    icon: Home,
  },
  {
    title: "Droits",
    href: "/droits",
    icon: ShieldCheck,
  },
  {
    title: "Écritures",
    href: "/ecritures",
    icon: FileText,
  },
  {
    title: "Calcul",
    href: "/calcul",
    icon: Calculator,
  },
  {
    title: "Décision",
    href: "/decision",
    icon: Gavel,
  },
  {
    title: "Paiement",
    href: "/paiement",
    icon: CreditCard,
  },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              MutationFlow
            </span>
          </Link>
          <div className="flex gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80 flex items-center gap-2",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
        {/* Mobile Navigation could go here */}
      </div>
    </nav>
  );
}

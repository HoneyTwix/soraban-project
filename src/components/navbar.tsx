'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="font-bold text-xl">
          Soraban
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/transactions">Transactions</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/categories">Categories</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/rules">Rules</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/reviews">Reviews</Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
} 
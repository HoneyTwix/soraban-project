import { ArrowRight, FileText, ListChecks, Settings, Shield } from "lucide-react";
import { FeatureCard } from "@/components/feature-card";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Soraban</h1>
        <p className="text-xl text-muted-foreground">
          Your intelligent bookkeeping system for efficient financial management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard
          title="Transactions"
          description="Record and import transactions with ease. Support for CSV imports and manual entry."
          href="/transactions"
          icon={<FileText className="w-8 h-8" />}
        />
        <FeatureCard
          title="Categories"
          description="Organize your transactions with smart categorization and bulk actions."
          href="/categories"
          icon={<ListChecks className="w-8 h-8" />}
        />
        <FeatureCard
          title="Rules"
          description="Set up automatic categorization rules to save time on transaction management."
          href="/rules"
          icon={<Settings className="w-8 h-8" />}
        />
        <FeatureCard
          title="Reviews"
          description="Review flagged transactions and anomalies for better financial oversight."
          href="/reviews"
          icon={<Shield className="w-8 h-8" />}
        />
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          Ready to streamline your bookkeeping process?
        </p>
        <a
          href="/transactions"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

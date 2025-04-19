"use client";

import { ArrowRight, FileText, ListChecks, Settings, Shield } from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { useEffect, useRef } from "react";

export default function Home() {
  const { user, isLoaded } = useUser();
  const hasProcessedRef = useRef(false);
  
  const { mutate: upsertUser } = api.user.upsert.useMutation();
  const { data: currentUser } = api.user.getCurrent.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user }
  );

  // Get all transactions to analyze
  const { data: transactions, isLoading: isLoadingTransactions, isFetching } = api.transaction.getAll.useQuery(
    { userId: user?.id ?? "" },
    { 
      enabled: !!user,
      staleTime: 3000, // Wait 3 seconds before refetching
      retry: false
    }
  );

  const flagTransaction = api.transaction.flag.useMutation({
    onError: (error) => {
      console.error("Error flagging transaction:", error);
    }
  });

  useEffect(() => {
    let isMounted = true;

    const processTransactions = async () => {
      if (!user || !isLoaded || !transactions || hasProcessedRef.current || isLoadingTransactions || isFetching) return;

      try {
        hasProcessedRef.current = true;

        // Function to calculate average amount
        const calculateAverage = (amounts: number[]) => {
          if (amounts.length === 0) return 0;
          const sum = amounts.reduce((acc, val) => acc + val, 0);
          return sum / amounts.length;
        };

        // Function to calculate standard deviation
        const calculateStdDev = (amounts: number[], mean: number) => {
          if (amounts.length === 0) return 0;
          const squareDiffs = amounts.map(value => Math.pow(value - mean, 2));
          const avgSquareDiff = calculateAverage(squareDiffs);
          return Math.sqrt(avgSquareDiff);
        };

        // Create a map to track duplicates
        const transactionMap = new Map();

        // Process transactions sequentially to avoid race conditions
        for (const transaction of transactions) {
          if (!isMounted) return; // Stop if component unmounted

          // Skip if transaction has been previously approved
          if (transaction.wasApproved) {
            continue;
          }

          const amount = parseFloat(transaction.amount.toString());
          const key = `${amount}-${transaction.date.toISOString()}-${transaction.description}`;

          try {
            // Check for duplicates
            if (transactionMap.has(key)) {
              await flagTransaction.mutateAsync({
                userId: user.id,
                transactionId: transaction.id,
                flag: "duplicate"
              });
            }
            transactionMap.set(key, transaction);

            // Calculate average and std dev excluding current transaction
            const otherTransactions = transactions.filter(t => t.id !== transaction.id);
            const otherAmounts = otherTransactions.map(t => parseFloat(t.amount.toString()));
            const avgAmount = calculateAverage(otherAmounts);
            const stdDev = calculateStdDev(otherAmounts, avgAmount);

            // Define thresholds for outliers (2 standard deviations)
            const upperThreshold = avgAmount + 2 * stdDev;
            const lowerThreshold = avgAmount - 2 * stdDev;

            // Check for unusual amount (outliers both high and low)
            if (amount > upperThreshold || amount < lowerThreshold) {
              await flagTransaction.mutateAsync({
                userId: user.id,
                transactionId: transaction.id,
                flag: "unusual_amount"
              });
            }

            // Check for incomplete data
            if (!transaction.description || !transaction.date) {
              await flagTransaction.mutateAsync({
                userId: user.id,
                transactionId: transaction.id,
                flag: "incomplete"
              });
            }

            // Check for uncategorized transactions
            if (!transaction.categories || transaction.categories.length === 0) {
              await flagTransaction.mutateAsync({
                userId: user.id,
                transactionId: transaction.id,
                flag: "uncategorized"
              });
            }
          } catch (error) {
            console.error("Error processing transaction:", transaction.id, error);
            continue;
          }

          // Add a small delay between transactions to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Error in processTransactions:", error);
      }
    };

    void processTransactions();

    return () => {
      isMounted = false;
    };
  }, [user, isLoaded, transactions, isLoadingTransactions, isFetching, flagTransaction]);

  useEffect(() => {
    if (!user || !isLoaded) return;

    // Only upsert if user doesn't exist or email has changed
    if (!currentUser || currentUser.email !== user.emailAddresses[0]?.emailAddress) {
      upsertUser({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || undefined,
      });
    }
  }, [user, isLoaded, currentUser, upsertUser]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

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
        <Link
          href="/transactions"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

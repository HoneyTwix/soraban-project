import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useUser } from "@clerk/nextjs";

export function useTransactionFlagging() {
  const { user } = useUser();
  const hasProcessedRef = useRef(false);

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
      if (!user || !transactions || hasProcessedRef.current || isLoadingTransactions || isFetching) return;

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
  }, [user, transactions, isLoadingTransactions, isFetching, flagTransaction]);
} 
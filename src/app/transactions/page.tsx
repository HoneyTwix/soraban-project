"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function TransactionsPage() {
  const router = useRouter();

  const handleAddTransaction = () => {
    const transactionId = uuidv4();
    router.push(`/transactions/${transactionId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-4">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={handleAddTransaction}>
            <FileText className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No transactions yet. Import a CSV file or add a transaction to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

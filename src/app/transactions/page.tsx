"use client";

import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { CSVImportModal } from "~/app/_components/CSVImportModal";
import { TransactionList } from "~/app/_components/TransactionList";
import { useUser } from "@clerk/nextjs";
import { useTransactionFlagging } from "~/hooks/useTransactionFlagging";

export default function TransactionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Use the transaction flagging hook
  useTransactionFlagging();

  const handleAddTransaction = () => {
    router.push(`/transactions/new`);
  };

  if (!user?.id) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-4">
          <Button onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={handleAddTransaction}>
            <FileText className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <TransactionList userId={user.id} />

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        userId={user.id}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TransactionFormProps {
  userId: string;
  initialData?: {
    description?: string;
    amount: string;
    date?: string;
    categoryIds?: string[];
  };
}

export function TransactionForm({ userId, initialData }: TransactionFormProps) {
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [amount, setAmount] = useState(initialData?.amount ?? "");
  const [date, setDate] = useState(initialData?.date ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initialData?.categoryIds ?? []);

  const { data: categories } = api.category.getAll.useQuery({ userId });
  const applyRules = api.rule.applyRules.useMutation();
  const router = useRouter();
  const utils = api.useUtils();
  
  const createTransaction = api.transaction.create.useMutation({
    onSuccess: async () => {
      try {
        // Invalidate transactions query to refresh the list
        await utils.transaction.getAll.invalidate({ userId });
        
        // Apply rules after transaction is created
        await applyRules.mutateAsync({
          userId: userId,
        });
        
        // Show success toast
        toast.success("Transaction added successfully");
        
        // Reset form and redirect back to transactions page
        router.push("/transactions");
      } catch (error) {
        console.error("Error in transaction creation:", error);
        toast.error("Failed to create transaction");
      }
    },
    onError: (error) => {
      toast.error("Failed to create transaction: " + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;

    createTransaction.mutate({
      userId,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Transaction" : "Add New Transaction"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={categoryIds[0] ?? "none"} 
              onValueChange={(value) => setCategoryIds(value !== "none" ? [value] : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={createTransaction.isPending}
            className="w-full"
          >
            {createTransaction.isPending ? "Saving..." : initialData ? "Save Changes" : "Add Transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
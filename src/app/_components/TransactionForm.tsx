"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionFormProps {
  userId: string;
  initialData?: {
    description?: string;
    amount: string;
    date?: string;
    categoryId?: string;
  };
}

export function TransactionForm({ userId, initialData }: TransactionFormProps) {
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [amount, setAmount] = useState(initialData?.amount ?? "");
  const [date, setDate] = useState(initialData?.date ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");

  const { data: categories } = api.category.getAll.useQuery({ userId });
  const createTransaction = api.transaction.create.useMutation({
    onSuccess: () => {
      setDescription("");
      setAmount("");
      setDate("");
      setCategoryId("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;

    createTransaction.mutate({
      userId,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
      categoryId: categoryId || undefined,
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
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
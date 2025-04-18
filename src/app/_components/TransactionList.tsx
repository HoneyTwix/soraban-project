import { useState } from "react";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transactions } from "~/server/db/schema";
import Link from "next/link";

type Transaction = typeof transactions.$inferSelect & {
  category: {
    id: string;
    name: string;
  } | null;
};

export function TransactionList({ userId }: { userId: string }) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isFlagged, setIsFlagged] = useState<boolean | undefined>();

  const { data: categories } = api.category.getAll.useQuery({ userId });
  const { data: transactions, isLoading } = api.transaction.getAll.useQuery({
    userId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    categoryId: categoryId || undefined,
    isFlagged,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flagged">Status</Label>
            <Select 
              value={isFlagged?.toString() ?? ""} 
              onValueChange={(value) => setIsFlagged(value === "true" ? true : value === "false" ? false : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Transactions</SelectItem>
                <SelectItem value="true">Flagged</SelectItem>
                <SelectItem value="false">Not Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {transactions?.map((transaction: Transaction) => (
              <Link key={transaction.id} href={`/transactions/${transaction.id}`}>
                <Card className="hover:bg-accent transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${transaction.amount}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category?.name ?? "Uncategorized"}
                        </p>
                      </div>
                    </div>
                    {transaction.isFlagged && (
                      <p className="mt-2 text-sm text-destructive">
                        Flagged: {transaction.flagReason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
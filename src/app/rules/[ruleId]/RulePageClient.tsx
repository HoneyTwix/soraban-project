"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { RuleForm } from "~/app/_components/RuleForm";
import { api } from "~/trpc/react";
import { redirect, useRouter } from "next/navigation";

interface RulePageClientProps {
  ruleId: string;
}

export default function RulePageClient({ ruleId }: RulePageClientProps) {
  const { user } = useUser();
  const router = useRouter();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const { data: rule, isLoading, error } = api.rule.getRuleById.useQuery(
    {
      userId: user.id,
      ruleId,
    },
    {
      retry: false, // Don't retry if rule not found
    }
  );

  // Handle error by redirecting
  if (error) {
    router.push('/rules');
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading rule...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If trying to edit a non-existent rule, show not found message
  if (!rule && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Rule Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The requested rule could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleForm userId={user.id} initialData={rule} />
        </CardContent>
      </Card>
    </div>
  );
} 
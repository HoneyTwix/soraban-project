import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RulesListProps {
  userId: string;
  maxHeight?: string;
}

export function RulesList({ userId, maxHeight = "calc(100vh - 200px)" }: RulesListProps) {
  const router = useRouter();
  const { data: rules, isLoading } = api.rule.getCategorizationRules.useQuery({
    userId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading rules...</div>
      </Card>
    );
  }

  if (!rules?.length) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No rules created yet. Add a rule to start automating your transaction categorization.
        </div>
      </Card>
    );
  }

  return (
    <ScrollArea className="w-full rounded-md" style={{ maxHeight }}>
      <div className="space-y-3 pr-4">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => router.push(`/rules/${rule.id}`)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium truncate">{rule.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {rule.conditionType === "description" && `If description ${rule.conditionSubtype} "${rule.conditionValue}"`}
                  {rule.conditionType === "amount" && `If amount ${rule.conditionSubtype} $${rule.conditionValue}`}
                  {rule.conditionType === "date" && `If date ${rule.conditionSubtype} ${rule.conditionValue}`}
                  {rule.conditionType === "ai" && `AI-based categorization: ${rule.aiPrompt}`}
                  {rule.category && `, categorize as "${rule.category.name}"`}
                </p>
              </div>
              <Button 
                variant="outline" 
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/rules/${rule.id}`);
                }}
              >
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 
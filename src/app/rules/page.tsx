import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Categorization Rules</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Amazon Purchases</h3>
                  <p className="text-sm text-muted-foreground">
                    If description contains &quot;amazon&quot;, categorize as &quot;Shopping&quot;
                  </p>
                </div>
                <Button variant="outline">Edit</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">High Value Transactions</h3>
                  <p className="text-sm text-muted-foreground">
                    If amount &gt; $1000, flag as &quot;High Value&quot;
                  </p>
                </div>
                <Button variant="outline">Edit</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
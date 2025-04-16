import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, X } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Review Dashboard</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Flagged Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <h3 className="font-medium">Unusual Amount</h3>
                    <p className="text-sm text-muted-foreground">
                      Transaction amount significantly higher than average
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button variant="outline" size="sm">
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <h3 className="font-medium">Potential Duplicate</h3>
                    <p className="text-sm text-muted-foreground">
                      Similar transaction detected within 24 hours
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button variant="outline" size="sm">
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
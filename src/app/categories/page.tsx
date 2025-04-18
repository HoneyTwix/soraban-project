"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { api } from "~/trpc/react";
import { useUser } from "@clerk/nextjs";

export default function CategoriesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data: categories, isLoading } = api.category.getAll.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user }
  );

  const handleAddCategory = () => {
    router.push('/categories/new');
  };

  if (!user?.id) {
    redirect("/sign-in");
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Categories</h1>
          <Button onClick={handleAddCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
        <div className="text-center text-muted-foreground py-8">
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Button onClick={handleAddCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => router.push(`/categories/${category.id}`)}
            >
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">
                  {category.description ?? "No description provided"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground">
              No categories yet. Click &quot;Add Category&quot; to create your first category.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
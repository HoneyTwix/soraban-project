"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CategoryFormProps {
  userId: string;
  categoryId?: string;
  initialData?: {
    name?: string;
    description?: string;
  };
}

export function CategoryForm({ userId, initialData, categoryId }: CategoryFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? "");
      setDescription(initialData.description ?? "");
    }
  }, [initialData]);

  const createCategory = api.category.create.useMutation({
    onSuccess: async () => {
      await utils.category.getAll.invalidate({ userId });
      toast.success("Category created successfully");
      router.push("/categories");
    },
    onError: (error) => {
      toast.error("Failed to create category: " + error.message);
    }
  });

  const updateCategory = api.category.update.useMutation({
    onSuccess: async () => {
      await utils.category.getAll.invalidate({ userId });
      toast.success("Category updated successfully");
      router.push("/categories");
    },
    onError: (error) => {
      toast.error("Failed to update category: " + error.message);
    }
  });

  const isPending = createCategory.isPending || updateCategory.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (categoryId !== undefined) {
      updateCategory.mutate({
        userId,
        categoryId: categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } else {
      createCategory.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        userId,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{categoryId ? "Edit Category" : "New Category"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter category description"
              rows={4}
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
          >
            {isPending
              ? "Saving..."
              : categoryId
              ? "Save Changes"
              : "Create Category"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
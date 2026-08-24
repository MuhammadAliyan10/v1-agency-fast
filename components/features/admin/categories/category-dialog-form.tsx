"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { categorySchema, type CategoryFormValues } from "@/lib/validations/category";
import { upsertCategory } from "@/server/actions/categories";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface CategoryDialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: any | null;
}

export function CategoryDialogForm({ open, onOpenChange, initialData }: CategoryDialogFormProps) {
  const isEditMode = !!initialData;
  const [isPending, startTransition] = useTransition();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name || "",
        slug: initialData.slug || "",
        description: initialData.description || "",
        sortOrder: initialData.sortOrder || 0,
        isActive: initialData.isActive ?? true,
      });
    } else if (open && !initialData) {
      form.reset({
        name: "",
        slug: "",
        description: "",
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [open, initialData, form]);

  // Auto-generate slug when name changes (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      const subscription = form.watch((value, { name }) => {
        if (name === "name") {
          const generatedSlug = (value.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
            
          // Only update if it doesn't match the current slug to prevent infinite loops
          if (generatedSlug !== form.getValues("slug")) {
            form.setValue("slug", generatedSlug, { shouldValidate: true });
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, isEditMode]);

  const onSubmit = (values: CategoryFormValues) => {
    startTransition(async () => {
      const res = await upsertCategory(values, initialData?.id);
      if (res.success) {
        toast.success(isEditMode ? "Category updated" : "Category created");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to save category");
        if (res.error?.includes("slug")) {
          form.setError("slug", { message: res.error });
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Category" : "Add New Category"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Make changes to your category here." : "Add a new category to organize your menu items."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Beverages" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., beverages" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used in URLs. Must be unique, lowercase, no spaces.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this category..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-center space-y-2 pt-2">
                    <FormLabel>Active Status</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">{field.value ? "Visible" : "Hidden"}</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Category"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

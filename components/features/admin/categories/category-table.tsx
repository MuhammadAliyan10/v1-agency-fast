"use client";

import { useState, useTransition } from "react";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toggleCategoryStatus, deleteCategory } from "@/server/actions/categories";
import { CategoryDialogForm } from "./category-dialog-form";

interface CategoryTableProps {
  data: any[];
}

export function CategoryTable({ data }: CategoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [isPending, startTransition] = useTransition();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Filter data client-side for categories since list is usually small
  const filteredData = data.filter((cat) => 
    cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    cat.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleCategoryStatus(id, !currentStatus);
      if (res.success) {
        toast.success("Category status updated");
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    startTransition(async () => {
      const res = await deleteCategory(itemToDelete);
      if (res.success) {
        toast.success("Category deleted successfully");
      } else {
        if (res.warning) {
          toast.warning(res.warning, { duration: 6000 });
        } else {
          toast.error(res.error || "Failed to delete category");
        }
      }
      setIsAlertOpen(false);
      setItemToDelete(null);
    });
  };

  const openDeleteAlert = (id: string) => {
    setItemToDelete(id);
    setIsAlertOpen(true);
  };

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] text-center">Order</TableHead>
              <TableHead>Category Info</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="text-center">Items Count</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FolderTree className="w-8 h-8 text-muted-foreground/50" />
                    <p>No categories found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono bg-muted/50 text-muted-foreground">
                      {item.sortOrder}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">/{item.slug}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[250px] truncate">
                    {item.description || <span className="italic opacity-50">No description</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.itemCount > 0 ? "default" : "secondary"}>
                      {item.itemCount} item{item.itemCount !== 1 && 's'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={item.isActive} 
                      onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Category
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => openDeleteAlert(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialogForm 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        initialData={selectedItem} 
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category from the database.
              <br/><br/>
              <strong>Note:</strong> You cannot delete a category if it still has active menu items linked to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toggleItemAvailability, deleteMenuItem } from "@/server/actions/menu";
import { MenuDialogForm } from "./menu-dialog-form";

interface MenuTableProps {
  data: {
    items: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  };
  categories: { id: string; name: string }[];
}

export function MenuTable({ data, categories }: MenuTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Update URL on search/filter changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
      params.set("page", "1"); // Reset to page 1 on new search
    } else {
      params.delete("search");
    }

    if (categoryFilter && categoryFilter !== "all") {
      params.set("category", categoryFilter);
      params.set("page", "1");
    } else {
      params.delete("category");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [debouncedSearch, categoryFilter, router, pathname, searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    // using useTransition for mutation feedback
    startTransition(async () => {
      const res = await toggleItemAvailability(id, !currentStatus);
      if (res.success) {
        toast.success("Availability updated");
      } else {
        toast.error(res.error || "Failed to update availability");
      }
    });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    startTransition(async () => {
      const res = await deleteMenuItem(itemToDelete);
      if (res.success) {
        if (res.warning) {
          toast.warning(res.warning, { duration: 6000 });
        } else {
          toast.success("Item deleted successfully");
        }
      } else {
        toast.error(res.error || "Failed to delete item");
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
        <div className="flex flex-1 w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead className="text-center">Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No menu items found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No img</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.isFeatured && (
                        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">Featured</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell>Rs. {item.basePrice}</TableCell>
                    <TableCell className="text-center">
                      <Switch 
                        checked={item.isAvailable} 
                        onCheckedChange={() => handleToggleAvailability(item.id, item.isAvailable)} 
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => openDeleteAlert(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((data.currentPage - 1) * 10) + 1} to {Math.min(data.currentPage * 10, data.totalCount)} of {data.totalCount} items
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={data.currentPage === 1 || isPending}
              onClick={() => handlePageChange(data.currentPage - 1)}
            >
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {data.currentPage} of {data.totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={data.currentPage === data.totalPages || isPending}
              onClick={() => handlePageChange(data.currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <MenuDialogForm 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        initialData={selectedItem} 
        categories={categories}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the menu item from your store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

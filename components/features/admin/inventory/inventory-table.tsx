"use client";

import { useState, useTransition } from "react";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, ArrowUpDown } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { deleteInventoryItem } from "@/server/actions/inventory";
import { InventoryDialogForm } from "./inventory-dialog-form";
import { StockAdjustDialog } from "./stock-adjust-dialog";

interface InventoryTableProps {
  data: any[];
}

export function InventoryTable({ data }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [isPending, startTransition] = useTransition();
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Client-side filtering
  const filteredData = data.filter((item) => 
    item.itemName.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    startTransition(async () => {
      const res = await deleteInventoryItem(itemToDelete);
      if (res.success) {
        toast.success("Inventory item deleted");
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
    setIsFormDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedItem(null);
    setIsFormDialogOpen(true);
  };

  const openAdjustDialog = (item: any) => {
    setSelectedItem(item);
    setIsAdjustDialogOpen(true);
  };

  // Status badge helper
  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock <= threshold) return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500">Low Stock</Badge>;
    return <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500">In Stock</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>
                    <span className="font-bold text-lg">{item.stockQuantity}</span>
                    <span className="text-muted-foreground ml-1">{item.unit}</span>
                  </TableCell>
                  <TableCell>
                    {getStockStatus(item.stockQuantity, item.lowStockThreshold)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    &le; {item.lowStockThreshold} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={() => openAdjustDialog(item)}>
                        <ArrowUpDown className="w-3 h-3 mr-1" /> Quick Adjust
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Manage Definition</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Item Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => openDeleteAlert(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InventoryDialogForm 
        open={isFormDialogOpen} 
        onOpenChange={setIsFormDialogOpen} 
        initialData={selectedItem} 
      />
      
      <StockAdjustDialog 
        open={isAdjustDialogOpen}
        onOpenChange={setIsAdjustDialogOpen}
        item={selectedItem}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this item? This action cannot be undone.
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

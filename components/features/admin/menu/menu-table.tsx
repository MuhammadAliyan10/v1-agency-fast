// components/features/admin/menu/menu-table.tsx
"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search, Plus, Pencil, Trash2, UtensilsCrossed, Flame, Leaf, Sparkles,
  TrendingUp, Clock, ChevronDown, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  toggleItemAvailability, deleteMenuItem, updateMenuItemPrice,
  bulkToggleCategoryAvailability,
} from "@/server/actions/menu";
import { MenuDialogForm } from "./menu-dialog-form";
import { cn } from "@/lib/utils";
import type { PaginatedMenuItem } from "@/server/actions/menu";

interface MenuTableProps {
  data: {
    items:       PaginatedMenuItem[];
    totalCount:  number;
    totalPages:  number;
    currentPage: number;
  };
  categories: { id: string; name: string }[];
}

// ── Inline Price Cell ─────────────────────────────────────────────────────────
function InlinePriceCell({ item, isPending }: { item: PaginatedMenuItem; isPending: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue  ] = useState(String(item.basePrice));
  const [saving,  setSaving ] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) { toast.error("Enter a valid price."); setValue(String(item.basePrice)); setEditing(false); return; }
    if (parsed === item.basePrice)   { setEditing(false); return; }
    setSaving(true);
    const res = await updateMenuItemPrice(item.id, parsed);
    if (res.success) { toast.success("Price updated"); }
    else { toast.error(res.error ?? "Failed to update price"); setValue(String(item.basePrice)); }
    setSaving(false); setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  handleSave();
    if (e.key === "Escape") { setValue(String(item.basePrice)); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground">Rs.</span>
        <Input ref={inputRef} type="number" value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown} onBlur={handleSave} className="h-7 w-20 text-sm px-1.5 py-0" disabled={saving} min={0} />
      </div>
    );
  }
  return (
    <button
      className="group flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors text-left disabled:cursor-not-allowed"
      onClick={e => { e.stopPropagation(); if (!isPending) setEditing(true); }}
      disabled={isPending} title="Click to edit price"
    >
      Rs. {item.basePrice}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

// ── Tag Badges ────────────────────────────────────────────────────────────────
function ItemTagBadges({ tags }: { tags: PaginatedMenuItem["tags"] }) {
  if (!tags) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.isSpicy   && <Badge className="text-[9px] px-1.5 py-0 bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100"><Flame className="w-2.5 h-2.5 mr-0.5" />Spicy</Badge>}
      {tags.isVeg     && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100"><Leaf className="w-2.5 h-2.5 mr-0.5" />Veg</Badge>}
      {tags.isNew     && <Badge className="text-[9px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 hover:bg-violet-100"><Sparkles className="w-2.5 h-2.5 mr-0.5" />New</Badge>}
      {tags.isPopular && <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100"><TrendingUp className="w-2.5 h-2.5 mr-0.5" />Popular</Badge>}
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportToCSV(items: PaginatedMenuItem[]) {
  const escape = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["Name", "Category", "Base Price", "Prep Time (min)", "Available", "Featured", "Spicy", "Veg", "New", "Popular", "Variants", "Add-Ons"];
  const rows = items.map(i => [
    escape(i.name),
    escape(i.categoryName),
    i.basePrice,
    i.preparationTime ?? "",
    i.isAvailable ? "Yes" : "No",
    i.isFeatured   ? "Yes" : "No",
    i.tags?.isSpicy   ? "Yes" : "No",
    i.tags?.isVeg     ? "Yes" : "No",
    i.tags?.isNew     ? "Yes" : "No",
    i.tags?.isPopular ? "Yes" : "No",
    escape(i.variants.map(v => `${v.name} (Rs.${v.price})`).join(", ")),
    escape(i.addOns.map(a => `${a.name} (Rs.${a.price})`).join(", ")),
  ].join(","));

  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `menu-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Menu exported to CSV");
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MenuTable({ data, categories }: MenuTableProps) {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const pathname    = usePathname();

  const [searchTerm,      setSearchTerm     ] = useState(searchParams.get("search")   || "");
  const [categoryFilter,  setCategoryFilter ] = useState(searchParams.get("category") || "all");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const [isDialogOpen,  setIsDialogOpen ] = useState(false);
  const [selectedItem,  setSelectedItem ] = useState<PaginatedMenuItem | null>(null);
  const [isAlertOpen,   setIsAlertOpen  ] = useState(false);
  const [itemToDelete,  setItemToDelete ] = useState<string | null>(null);
  const [isPending,     startTransition ] = useTransition();

  useEffect(() => {
    const currentSearch   = searchParams.get("search")   || "";
    const currentCategory = searchParams.get("category") || "all";
    if (debouncedSearch === currentSearch && categoryFilter === currentCategory) return;
    const params = new URLSearchParams(searchParams.toString());
    debouncedSearch ? params.set("search", debouncedSearch) : params.delete("search");
    categoryFilter !== "all" ? params.set("category", categoryFilter) : params.delete("category");
    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [debouncedSearch, categoryFilter, pathname, router, searchParams]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const handleToggleAvailability = (id: string, current: boolean) => {
    startTransition(async () => {
      const res = await toggleItemAvailability(id, !current);
      if (res.success) toast.success("Availability updated");
      else toast.error(res.error ?? "Failed to update availability");
    });
  };

  const handleBulkToggle = (isAvailable: boolean) => {
    if (categoryFilter === "all") { toast.error("Select a specific category first."); return; }
    startTransition(async () => {
      const res = await bulkToggleCategoryAvailability(categoryFilter, isAvailable);
      if (res.success) toast.success(`All items in category marked as ${isAvailable ? "available" : "unavailable"}`);
      else toast.error(res.error ?? "Bulk update failed");
    });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    startTransition(async () => {
      const res = await deleteMenuItem(itemToDelete);
      if (res.success) {
        res.warning ? toast.warning(res.warning, { duration: 6000 }) : toast.success("Item deleted");
      } else {
        toast.error(res.error ?? "Failed to delete item");
      }
      setIsAlertOpen(false); setItemToDelete(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search menu items..." className="pl-8 h-9"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Bulk Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={isPending}>
                Bulk Actions <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {categoryFilter === "all" ? "Select a category to bulk edit" : `Category: ${categories.find(c => c.id === categoryFilter)?.name}`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={categoryFilter === "all" || isPending}
                onClick={() => handleBulkToggle(true)}
                className="text-emerald-600"
              >
                Mark Category Available
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={categoryFilter === "all" || isPending}
                onClick={() => handleBulkToggle(false)}
                className="text-rose-600"
              >
                Mark Category Unavailable
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => exportToCSV(data.items)}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>

          {/* Add Item */}
          <Button onClick={() => { setSelectedItem(null); setIsDialogOpen(true); }} size="sm" className="h-9 gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/40 border-border">
                <TableHead className="w-[60px] text-xs font-semibold text-muted-foreground uppercase tracking-wide">Image</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[180px]">Name & Tags</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Price <span className="ml-1 text-[10px] normal-case font-normal text-muted-foreground/60">(click to edit)</span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prep</div>
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30" />
                      {searchTerm || categoryFilter !== "all" ? (
                        <>
                          <p className="font-semibold text-sm">No items match your filters</p>
                          <Button variant="outline" size="sm" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); }}>Clear Filters</Button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm">No menu items yet</p>
                          <Button size="sm" onClick={() => { setSelectedItem(null); setIsDialogOpen(true); }} className="gap-2">
                            <Plus className="w-4 h-4" /> Add First Item
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map(item => (
                  <TableRow key={item.id} className={cn("border-border transition-colors cursor-pointer", isPending && "opacity-50")}>
                    <TableCell>
                      <div className="w-10 h-10 bg-muted flex items-center justify-center overflow-hidden border border-border">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <UtensilsCrossed className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.isFeatured && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Featured</Badge>
                        )}
                      </div>
                      <ItemTagBadges tags={item.tags} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{item.categoryName ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <InlinePriceCell item={item} isPending={isPending} />
                      {item.variants.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.variants.length} variant{item.variants.length > 1 ? "s" : ""}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.preparationTime ? (
                        <span className="text-sm font-medium">{item.preparationTime} min</span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.isAvailable ?? false}
                        onCheckedChange={() => handleToggleAvailability(item.id, item.isAvailable ?? false)}
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => { setSelectedItem(item); setIsDialogOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => { setItemToDelete(item.id); setIsAlertOpen(true); }}>
                          <Trash2 className="w-3.5 h-3.5" />
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
          <p className="text-xs text-muted-foreground">
            {((data.currentPage - 1) * 10) + 1}–{Math.min(data.currentPage * 10, data.totalCount)} of {data.totalCount} items
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={data.currentPage === 1 || isPending} onClick={() => handlePageChange(data.currentPage - 1)}>Previous</Button>
            <span className="text-xs font-medium text-muted-foreground px-2">Page {data.currentPage} of {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={data.currentPage === data.totalPages || isPending} onClick={() => handlePageChange(data.currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}

      <MenuDialogForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={
          selectedItem
            ? ({ ...selectedItem, isAvailable: selectedItem.isAvailable ?? false, isFeatured: selectedItem.isFeatured ?? false } as any)
            : null
        }
        categories={categories}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Items linked to existing orders will be archived instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

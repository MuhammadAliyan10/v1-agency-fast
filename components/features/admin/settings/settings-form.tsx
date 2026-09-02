"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { bulkUpdateSettings } from "@/server/actions/settings";
import { toast } from "sonner";
import { Building2, ReceiptText, Banknote, Save, Loader2 } from "lucide-react";

interface SettingsFormProps {
  initialSettings: Record<string, string>;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_name: initialSettings.store_name || "AgencyFast Restaurant",
    store_address: initialSettings.store_address || "",
    contact_phone: initialSettings.contact_phone || "",
    tax_rate: initialSettings.tax_rate || "0",
    delivery_fee: initialSettings.delivery_fee || "0",
    currency_symbol: initialSettings.currency_symbol || "Rs.",
    receipt_footer: initialSettings.receipt_footer || "Thank you for dining with us!",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await bulkUpdateSettings(formData);
    if (res.success) {
      toast.success("Settings updated successfully!");
    } else {
      toast.error(res.error || "Failed to update settings.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* General Information */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            General Information
          </CardTitle>
          <CardDescription>Publicly displayed store identity and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name</Label>
              <Input 
                id="store_name" 
                value={formData.store_name}
                onChange={(e) => handleChange("store_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input 
                id="contact_phone" 
                value={formData.contact_phone}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store_address">Physical Address</Label>
            <Textarea 
              id="store_address" 
              value={formData.store_address}
              onChange={(e) => handleChange("store_address", e.target.value)}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Financials & Delivery */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-5 h-5 text-muted-foreground" />
            Financials & Fees
          </CardTitle>
          <CardDescription>Configure global rates applied to all orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input 
                id="currency_symbol" 
                value={formData.currency_symbol}
                onChange={(e) => handleChange("currency_symbol", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Global Tax Rate (%)</Label>
              <Input 
                id="tax_rate" 
                type="number" 
                min="0"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => handleChange("tax_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_fee">Base Delivery Fee</Label>
              <Input 
                id="delivery_fee" 
                type="number" 
                min="0"
                value={formData.delivery_fee}
                onChange={(e) => handleChange("delivery_fee", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printing & Receipts */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-muted-foreground" />
            Printing & Receipts
          </CardTitle>
          <CardDescription>Customize the physical printed receipts for customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt_footer">Receipt Footer Message</Label>
            <Textarea 
              id="receipt_footer" 
              value={formData.receipt_footer}
              onChange={(e) => handleChange("receipt_footer", e.target.value)}
              className="resize-none"
              placeholder="e.g. Thanks for dining with us! Follow us @agencyfast"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/50 bg-muted/20 px-6 py-4 mt-6">
          <Button 
            className="w-full sm:w-auto" 
            onClick={handleSave} 
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save All Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

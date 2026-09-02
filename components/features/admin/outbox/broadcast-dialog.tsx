"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queueBroadcast } from "@/server/actions/outbox";
import { toast } from "sonner";
import { Loader2, Megaphone, MessageSquareWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const OPT_OUT_TEXT = "\n\nReply STOP to unsubscribe.";

const broadcastSchema = z.object({
  messageText: z.string().min(1, { message: "Message zaroori hai (Message is required)" }),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export function BroadcastDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      messageText: "",
    },
  });

  const messageText = form.watch("messageText");

  const onSubmit = async (data: BroadcastFormValues) => {
    try {
      const finalPayload = data.messageText.trim() + OPT_OUT_TEXT;
      
      const res = await queueBroadcast({ text: finalPayload });
      
      if (!res.success) {
        throw new Error(res.error);
      }

      toast.success(`Broadcast queued to ${res.count} customers!`, {
        description: "The background worker will process these in batches.",
      });
      setIsOpen(false);
      form.reset();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to queue broadcast");
    }
  };

  const previewText = messageText.trim() ? messageText.trim() + OPT_OUT_TEXT : "Your message preview will appear here..." + OPT_OUT_TEXT;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-500" />
            New CRM Broadcast
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            
            <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900">
              <MessageSquareWarning className="h-4 w-4" />
              <AlertTitle>Meta Compliance Warning</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                To prevent your business number from being banned for spam, a mandatory opt-out string will be appended to the end of your message. Ensure your message provides value to the customer.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="messageText"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Message Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Hi there! Get 20% off your next order..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 bg-muted/50 p-4 border">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Final Preview (Exactly what will be sent)</Label>
              <div className="bg-emerald-100 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-3 text-sm whitespace-pre-wrap font-mono text-emerald-900 dark:text-emerald-200">
                {previewText}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting || !messageText.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {form.formState.isSubmitting ? "Processing..." : "Queue Broadcast"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

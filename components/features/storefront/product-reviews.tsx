"use client";

import React, { useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { submitReview } from "@/server/actions/product";

const reviewSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, "Comment must be at least 5 characters"),
});

interface ProductReviewsProps {
  menuItemId: string;
  reviews: any[];
  averageRating: number;
  reviewCount: number;
}

export function ProductReviews({ menuItemId, reviews, averageRating, reviewCount }: ProductReviewsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      customerName: "",
      rating: 5,
      comment: "",
    },
  });

  async function onSubmit(values: z.infer<typeof reviewSchema>) {
    setIsSubmitting(true);
    const result = await submitReview({
      menuItemId,
      ...values
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Review submitted successfully!");
      form.reset();
    } else {
      toast.error(result.error || "Failed to submit review");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-12 font-bold flex items-center justify-center gap-2 border-border/50 hover:bg-muted/50 rounded-xl mt-8">
          <MessageSquare className="w-4 h-4" />
          View {reviewCount} Reviews
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[90vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-black tracking-tight mb-2 text-foreground">Customer Reviews</DialogTitle>
        </DialogHeader>

      <Accordion type="single" collapsible className="w-full mb-6">
        <AccordionItem value="write-review" className="border border-border/50 rounded-xl bg-muted/10 px-4 data-[state=open]:bg-muted/30 transition-colors">
          <AccordionTrigger className="hover:no-underline font-semibold text-sm py-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Write a Review
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Rating</FormLabel>
                        <FormControl>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => field.onChange(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`w-6 h-6 transition-colors ${
                                    star <= field.value ? "fill-amber-500 text-amber-500" : "fill-muted text-muted"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" className="h-10 text-sm bg-background border-border/50 focus-visible:ring-primary/20" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Review Comment</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What did you think about this item?" 
                            className="resize-none h-24 text-sm bg-background border-border/50 focus-visible:ring-primary/20"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="sm" disabled={isSubmitting} className="w-full font-bold h-10 rounded-lg text-sm">
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </form>
              </Form>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 border border-border/50 rounded-xl shadow-sm">
            <p className="text-sm text-muted-foreground font-light">No reviews yet.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-muted/30 border border-border/50 p-3 rounded-xl transition-all shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-bold text-sm text-foreground">{review.customerName}</h4>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? "fill-current" : "fill-muted text-muted/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <p className="text-foreground/90 text-sm leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
}

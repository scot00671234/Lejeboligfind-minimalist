import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { insertMessageSchema } from "@shared/schema";
import type { InsertMessage } from "@shared/schema";
import { z } from "zod";

const messageFormSchema = z.object({
  content: z.string().min(10, "Beskeden skal være mindst 10 tegn"),
});

type MessageFormData = z.infer<typeof messageFormSchema>;

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
  receiverId: number;
}

export function MessageModal({ isOpen, onClose, propertyId, receiverId }: MessageModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      content: "",
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const messageData: InsertMessage = {
        content: data.content,
        propertyId,
        senderId: user!.id,
        receiverId,
      };
      
      return await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      // Invalider alle relevante queries
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      
      toast({
        title: "Besked sendt",
        description: "Din besked er blevet sendt til udlejeren",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: MessageFormData) => {
    sendMessage.mutate(data);
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kontakt udlejer</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Besked</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Hej, jeg er interesseret i din bolig..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuller
              </Button>
              <Button type="submit" disabled={sendMessage.isPending}>
                {sendMessage.isPending ? "Sender..." : "Send besked"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

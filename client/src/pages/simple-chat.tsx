import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SimpleMessage {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  propertyId: number;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    email: string;
  };
  receiver: {
    id: number;
    name: string;
    email: string;
  };
  property: {
    id: number;
    title: string;
  };
}

export default function SimpleChat() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState<number>(1); // Default to user 1

  // Simple query to get all messages
  const { data: messages, isLoading: messagesLoading } = useQuery<SimpleMessage[]>({
    queryKey: ['simple-messages'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messages');
      return response;
    },
    enabled: isAuthenticated,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; receiverId: number }) => {
      return await apiRequest('POST', '/api/messages', {
        content: data.content,
        receiverId: data.receiverId,
        propertyId: 1, // Default to property 1
        senderId: user!.id,
      });
    },
    onSuccess: () => {
      setNewMessage("");
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['simple-messages'] });
      toast({
        title: "Besked sendt",
        description: "Din besked er blevet sendt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() && user) {
      sendMessage.mutate({
        content: newMessage.trim(),
        receiverId: receiverId,
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Indlæser...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Du skal logge ind for at se beskeder</p>
          <Button onClick={() => navigate("/")}>Gå til forsiden</Button>
        </div>
      </div>
    );
  }

  // Filter messages for current user
  const myMessages = messages?.filter(msg => 
    msg.senderId === user!.id || msg.receiverId === user!.id
  ) || [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Simpel Chat - {user!.name} (ID: {user!.id})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Receiver selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Send besked til:</label>
              <select 
                value={receiverId} 
                onChange={(e) => setReceiverId(Number(e.target.value))}
                className="border rounded px-3 py-2"
              >
                <option value={1}>User 1 (scott)</option>
                <option value={2}>User 2 (Science)</option>
                <option value={3}>User 3 (s)</option>
              </select>
            </div>

            {/* Messages */}
            <div className="border rounded p-4 h-96 overflow-y-auto mb-4 space-y-2">
              {messagesLoading ? (
                <p>Indlæser beskeder...</p>
              ) : myMessages.length === 0 ? (
                <p>Ingen beskeder endnu</p>
              ) : (
                myMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`p-3 rounded max-w-xs ${
                      message.senderId === user!.id
                        ? 'bg-blue-500 text-white ml-auto'
                        : 'bg-gray-200 text-black'
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {message.senderId === user!.id ? 'Du' : message.sender.name}
                    </p>
                    <p>{message.content}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Send message */}
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Skriv din besked..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={sendMessage.isPending}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessage.isPending}
              >
                {sendMessage.isPending ? 'Sender...' : 'Send'}
              </Button>
            </div>

            {/* Debug info */}
            <div className="mt-4 p-2 bg-gray-100 rounded text-sm">
              <p>Debug: Total beskeder i systemet: {messages?.length || 0}</p>
              <p>Debug: Mine beskeder: {myMessages.length}</p>
              <p>Debug: Sendes til bruger ID: {receiverId}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
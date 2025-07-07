import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";

interface Message {
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

export default function Chat() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null);

  // Hent alle beskeder
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messages');
      return Array.isArray(response) ? response : [];
    },
    enabled: isAuthenticated,
    refetchInterval: 2000,
  });

  // Send besked
  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; receiverId: number }) => {
      return await apiRequest('POST', '/api/messages', {
        content: data.content,
        receiverId: data.receiverId,
        propertyId: 1,
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: "Besked sendt",
        description: "Din besked er sendt",
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
    if (newMessage.trim() && selectedReceiverId && user) {
      sendMessage.mutate({
        content: newMessage.trim(),
        receiverId: selectedReceiverId,
      });
    }
  };

  // Find alle andre brugere
  const otherUsers = [
    { id: 1, name: "scott" },
    { id: 2, name: "Science" },
    { id: 3, name: "s" },
  ].filter(u => u.id !== user?.id);

  // Find beskeder mellem mig og valgte bruger
  const conversationMessages = messages.filter(msg => 
    (msg.senderId === user?.id && msg.receiverId === selectedReceiverId) ||
    (msg.senderId === selectedReceiverId && msg.receiverId === user?.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Indlæser...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Du skal være logget ind for at bruge chat</p>
          <Button onClick={() => navigate("/")}>Gå til forsiden</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Chat</span>
              <span className="text-sm text-muted-foreground">
                - {user?.name} (ID: {user?.id})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Vælg samtale */}
              <div className="md:col-span-1">
                <h3 className="font-semibold mb-2">Samtaler</h3>
                <div className="space-y-2">
                  {otherUsers.map(otherUser => (
                    <button
                      key={otherUser.id}
                      onClick={() => setSelectedReceiverId(otherUser.id)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedReceiverId === otherUser.id 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{otherUser.name}</div>
                      <div className="text-sm text-gray-500">User {otherUser.id}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat område */}
              <div className="md:col-span-3">
                {!selectedReceiverId ? (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    Vælg en samtale for at starte
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Beskeder */}
                    <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3">
                      {conversationMessages.length === 0 ? (
                        <div className="text-center text-gray-500">
                          Ingen beskeder endnu. Start en samtale!
                        </div>
                      ) : (
                        conversationMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderId === user?.id ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg ${
                                message.senderId === user?.id
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              }`}
                            >
                              <div className="text-sm font-medium">
                                {message.senderId === user?.id ? 'Du' : message.sender.name}
                              </div>
                              <div className="mt-1">{message.content}</div>
                              <div className="text-xs mt-1 opacity-75">
                                {new Date(message.createdAt).toLocaleTimeString('da-DK', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Send besked */}
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Skriv en besked..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sendMessage.isPending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessage.isPending}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Debug info */}
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>Total beskeder: {messages.length}</div>
                <div>Samtale beskeder: {conversationMessages.length}</div>
                <div>Valgt bruger: {selectedReceiverId ? `User ${selectedReceiverId}` : 'Ingen'}</div>
                <div>Loading: {messagesLoading ? 'Ja' : 'Nej'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
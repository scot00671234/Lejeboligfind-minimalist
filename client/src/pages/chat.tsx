import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Home, User } from "lucide-react";

interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  propertyId: number;
  createdAt: string;
  read: boolean;
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
    address: string;
    price: number;
    type: string;
  };
}

interface Conversation {
  id: string; // propertyId-otherUserId
  propertyId: number;
  otherUserId: number;
  otherUserName: string;
  propertyTitle: string;
  propertyAddress: string;
  lastMessage?: Message;
  unreadCount: number;
}

export default function Chat() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hent alle beskeder med forbedret caching per bruger
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['messages', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messages');
      return Array.isArray(response) ? response : [];
    },
    enabled: isAuthenticated && !!user,
    refetchInterval: 2000,
    staleTime: 1000, // Data er fresh i 1 sekund
  });

  // Gruppér beskeder i samtaler per bolig og bruger
  const conversations: Conversation[] = useMemo(() => {
    if (!user || !messages.length) return [];

    const conversationMap = new Map<string, Conversation>();

    messages.forEach(message => {
      const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
      const otherUserName = message.senderId === user.id ? message.receiver.name : message.sender.name;
      
      // Konsistent nøgle uanset hvem der er sender/modtager
      const conversationKey = `${message.propertyId}-${Math.min(user.id, otherUserId)}-${Math.max(user.id, otherUserId)}`;

      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          id: conversationKey,
          propertyId: message.propertyId,
          otherUserId,
          otherUserName,
          propertyTitle: message.property.title,
          propertyAddress: message.property.address,
          unreadCount: 0,
        });
      }

      const conversation = conversationMap.get(conversationKey)!;
      
      // Opdater sidste besked
      if (!conversation.lastMessage || new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
        conversation.lastMessage = message;
      }

      // Tæl ulæste beskeder (kun beskeder modtaget af nuværende bruger)
      if (message.receiverId === user.id && !message.read) {
        conversation.unreadCount++;
      }
    });

    return Array.from(conversationMap.values())
      .sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime; // Nyeste samtaler først
      });
  }, [messages, user]);

  // Auto-scroll til bunden når nye beskeder kommer
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConversation]);

  // Send besked
  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; receiverId: number; propertyId: number }) => {
      return await apiRequest('POST', '/api/messages', {
        content: data.content,
        receiverId: data.receiverId,
        propertyId: data.propertyId,
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id] });
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
    if (newMessage.trim() && selectedConversation && user) {
      sendMessage.mutate({
        content: newMessage.trim(),
        receiverId: selectedConversation.otherUserId,
        propertyId: selectedConversation.propertyId,
      });
    }
  };

  // Find beskeder for valgte samtale
  const conversationMessages = useMemo(() => {
    if (!selectedConversation || !user) return [];
    
    return messages.filter(msg => 
      msg.propertyId === selectedConversation.propertyId &&
      ((msg.senderId === user.id && msg.receiverId === selectedConversation.otherUserId) ||
       (msg.senderId === selectedConversation.otherUserId && msg.receiverId === user.id))
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedConversation, user]);

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
              {/* Samtaler list */}
              <div className="md:col-span-1">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Samtaler
                </h3>
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Ingen samtaler endnu
                    </div>
                  ) : (
                    conversations.map(conversation => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          selectedConversation?.id === conversation.id 
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-500' 
                            : 'bg-card hover:bg-muted border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {conversation.otherUserName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Home className="h-3 w-3" />
                              <span className="truncate">{conversation.propertyTitle}</span>
                            </div>
                            {conversation.lastMessage && (
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {conversation.lastMessage.content}
                              </div>
                            )}
                          </div>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2 px-1 min-w-5 h-5 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat område */}
              <div className="md:col-span-3">
                {!selectedConversation ? (
                  <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                    <User className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">Vælg en samtale</p>
                    <p className="text-sm">Vælg en samtale fra listen for at begynde at chatte</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-96">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 p-4 border-b bg-muted/50 rounded-t-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{selectedConversation.otherUserName}</h4>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Home className="h-3 w-3" />
                          <span className="truncate">{selectedConversation.propertyTitle}</span>
                        </div>
                      </div>
                    </div>

                    {/* Beskeder */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                      {conversationMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Ingen beskeder endnu</p>
                            <p className="text-xs">Start en samtale!</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {conversationMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.senderId === user?.id ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                                  message.senderId === user?.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-background border'
                                }`}
                              >
                                <div className="text-sm font-medium mb-1">
                                  {message.senderId === user?.id ? 'Du' : message.sender.name}
                                </div>
                                <div className="text-sm">{message.content}</div>
                                <div className={`text-xs mt-1 ${
                                  message.senderId === user?.id ? 'text-blue-100' : 'text-muted-foreground'
                                }`}>
                                  {new Date(message.createdAt).toLocaleTimeString('da-DK', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
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
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <div className="grid grid-cols-3 gap-2">
                  <div>Samtaler: {conversations.length}</div>
                  <div>Beskeder: {messages.length}</div>
                  <div>Valgt: {selectedConversation ? selectedConversation.otherUserName : 'Ingen'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
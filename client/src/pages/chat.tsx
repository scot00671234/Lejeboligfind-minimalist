import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Message, Property, User, InsertMessage } from "@shared/schema";

type ConversationMessage = Message & {
  property: Property;
  sender: User;
  receiver: User;
};

type ConversationGroup = {
  propertyId: number;
  propertyTitle: string;
  otherUser: User;
  messages: ConversationMessage[];
  lastMessage: ConversationMessage;
  unreadCount: number;
};

export default function Chat() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading, refetch } = useQuery<ConversationMessage[]>({
    queryKey: ["/api/messages"],
    enabled: isAuthenticated,
    refetchInterval: 3000, // Refetch every 3 seconds
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Adgang nægtet",
        description: "Du skal være logget ind for at se beskeder",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate, toast]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  // Auto-update selected conversation when messages change
  useEffect(() => {
    if (selectedConversation && messages && user) {
      // Find the updated conversation using the same logic as conversation grouping
      const otherUserId = selectedConversation.otherUser.id;
      const userIds = [user.id, otherUserId].sort((a, b) => a - b);
      const conversationKey = `${selectedConversation.propertyId}-${userIds[0]}-${userIds[1]}`;
      
      // Filter messages for this specific conversation
      const conversationMessages = messages.filter(message => {
        const messageOtherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
        const messageUserIds = [user.id, messageOtherUserId].sort((a, b) => a - b);
        const messageKey = `${message.propertyId}-${messageUserIds[0]}-${messageUserIds[1]}`;
        return messageKey === conversationKey;
      });

      // Update selected conversation with latest messages
      if (conversationMessages.length > 0) {
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: conversationMessages.sort((a, b) => 
            new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
          )
        } : null);
      }
    }
  }, [messages, selectedConversation?.propertyId, selectedConversation?.otherUser.id, user?.id]);

  const sendMessage = useMutation({
    mutationFn: async (data: { content: string; propertyId: number; receiverId: number }) => {
      const messageData: InsertMessage = {
        content: data.content,
        propertyId: data.propertyId,
        receiverId: data.receiverId,
        senderId: user!.id,
      };
      await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      setNewMessage("");
      // Force immediate refetch to show new message
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p>Indlæser...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Group messages by conversation
  const conversations: ConversationGroup[] = [];
  
  if (messages) {
    const groupedMessages = messages.reduce((acc, message) => {
      // Create a consistent key by sorting user IDs to ensure same conversation regardless of who sends
      const otherUserId = message.senderId === user?.id ? message.receiverId : message.senderId;
      const userIds = [user!.id, otherUserId].sort((a, b) => a - b);
      const key = `${message.propertyId}-${userIds[0]}-${userIds[1]}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(message);
      return acc;
    }, {} as Record<string, ConversationMessage[]>);

    Object.values(groupedMessages).forEach(messageGroup => {
      if (messageGroup.length > 0) {
        const firstMessage = messageGroup[0];
        const lastMessage = messageGroup[messageGroup.length - 1];
        const otherUser = firstMessage.senderId === user?.id ? firstMessage.receiver : firstMessage.sender;
        const unreadCount = messageGroup.filter(m => 
          m.receiverId === user?.id && !m.read
        ).length;

        conversations.push({
          propertyId: firstMessage.propertyId,
          propertyTitle: firstMessage.property.title,
          otherUser,
          messages: messageGroup.sort((a, b) => 
            new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
          ),
          lastMessage,
          unreadCount,
        });
      }
    });
  }

  // Sort conversations by last message date
  conversations.sort((a, b) => 
    new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime()
  );

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      sendMessage.mutate({
        content: newMessage.trim(),
        propertyId: selectedConversation.propertyId,
        receiverId: selectedConversation.otherUser.id,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto flex h-screen">
        {/* Sidebar with conversation list */}
        <div className="w-1/3 border-r border-border bg-card">
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Tilbage</span>
              </Button>
              <h1 className="text-xl font-bold">Beskeder</h1>
            </div>
          </div>
          
          <div className="overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Du har ingen beskeder endnu</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={`${conversation.propertyId}-${conversation.otherUser.id}`}
                    className={`p-4 hover:bg-muted cursor-pointer border-b border-border ${
                      selectedConversation?.propertyId === conversation.propertyId &&
                      selectedConversation?.otherUser.id === conversation.otherUser.id
                        ? "bg-muted"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{conversation.propertyTitle}</h3>
                        <p className="text-xs text-muted-foreground">
                          {conversation.otherUser.name || conversation.otherUser.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {conversation.lastMessage.content}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-border bg-card">
                <h2 className="font-medium">{selectedConversation.propertyTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.otherUser.name || selectedConversation.otherUser.email}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.messages.map((message, index) => {
                  const isCurrentUser = message.senderId === user?.id;
                  const showName = index === 0 || 
                    selectedConversation.messages[index - 1].senderId !== message.senderId;
                  
                  return (
                    <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs ${isCurrentUser ? "items-end" : "items-start"} flex flex-col`}>
                        {showName && (
                          <p className={`text-xs text-muted-foreground mb-1 px-1 ${isCurrentUser ? "text-right" : "text-left"}`}>
                            {isCurrentUser ? "Du" : (message.sender.name || message.sender.email)}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            isCurrentUser
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className={`text-xs opacity-70 mt-1 px-1 ${isCurrentUser ? "text-right" : "text-left"}`}>
                          {new Date(message.createdAt!).toLocaleString("da-DK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Skriv en besked..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Vælg en samtale for at begynde</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
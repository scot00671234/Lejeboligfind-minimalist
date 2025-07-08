import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Home, MessageCircle } from "lucide-react";

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
  id: string;
  propertyId: number;
  otherUserId: number;
  otherUserName: string;
  propertyTitle: string;
  propertyAddress: string;
  lastMessage: Message;
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

  // Fetch conversations - using exact endpoint as specified
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['messages', 'conversations', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messages/conversations');
      console.log('CONVERSATIONS RESPONSE:', response);
      return Array.isArray(response) ? response : [];
    },
    enabled: isAuthenticated && !!user,
    refetchInterval: 2000,
    staleTime: 1000,
  });

  // Fetch messages for selected conversation - using exact endpoint as specified
  const { data: conversationMessages = [], isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ['messages', selectedConversation?.id, user?.id],
    queryFn: async () => {
      if (!selectedConversation || !user) {
        console.log('No conversation or user selected');
        return [];
      }
      console.log('Fetching messages for conversation:', selectedConversation.id);
      const response = await apiRequest('GET', `/api/messages/${selectedConversation.id}`);
      console.log('Messages response:', response);
      return Array.isArray(response) ? response : [];
    },
    enabled: isAuthenticated && !!user && !!selectedConversation,
    refetchInterval: 3000,
    staleTime: 1000,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

  // Send message mutation
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
      // Invalidate both conversations and specific conversation messages
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations', user?.id] });
      if (selectedConversation) {
        queryClient.invalidateQueries({ 
          queryKey: ['messages', selectedConversation.id, user?.id] 
        });
      }
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

  if (isLoading || conversationsLoading) {
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conversation Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
          </h1>
          <p className="text-sm text-gray-500">{user?.name}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 text-center text-gray-500">Indlæser samtaler...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Ingen samtaler endnu</p>
              <p className="text-xs">Send en besked til en boligejer for at starte</p>
              <p className="text-xs text-gray-400 mt-2">Debug: Auth={isAuthenticated}, User={user?.id}, Count={conversations.length}</p>
              <p className="text-xs text-gray-400">Raw: {JSON.stringify(conversations)}</p>
            </div>
          ) : (
            conversations.map(conversation => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedConversation?.id === conversation.id 
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' 
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {conversation.otherUserName}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Home className="h-3 w-3" />
                      <span className="truncate">{conversation.propertyTitle}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {conversation.lastMessage.content}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(conversation.lastMessage.createdAt).toLocaleString('da-DK', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </div>
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

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
            <h2 className="text-xl font-medium mb-2">Vælg en samtale</h2>
            <p className="text-sm">Vælg en samtale fra listen for at begynde at chatte</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-semibold">{selectedConversation.otherUserName}</h2>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Home className="h-3 w-3" />
                    <span>{selectedConversation.propertyTitle}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Indlæser beskeder...</div>
                </div>
              ) : messagesError ? (
                <div className="flex items-center justify-center h-full text-red-500">
                  <div className="text-center">
                    <p>Fejl ved indlæsning af beskeder</p>
                    <p className="text-sm">{messagesError.message}</p>
                  </div>
                </div>
              ) : conversationMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Ingen beskeder endnu</p>
                    <p className="text-sm">Start samtalen!</p>
                    <p className="text-xs mt-2">Conversation ID: {selectedConversation?.id}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
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
                            : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {message.senderId === user?.id ? 'Du' : message.sender.name}
                        </div>
                        <div className="text-sm">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
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
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
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
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  size="icon"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
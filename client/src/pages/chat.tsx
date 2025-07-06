import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import type { Message, Property, User } from "@shared/schema";

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

  const { data: messages, isLoading: messagesLoading } = useQuery<ConversationMessage[]>({
    queryKey: ["/api/messages"],
    enabled: isAuthenticated,
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

  // Group messages by property and other user
  const conversations: ConversationGroup[] = [];
  
  if (messages) {
    const groupedMessages = messages.reduce((acc, message) => {
      const key = `${message.propertyId}-${message.senderId === user?.id ? message.receiverId : message.senderId}`;
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Tilbage</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Beskeder</h1>
        </div>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Ingen beskeder endnu</h3>
              <p className="text-muted-foreground">
                Dine samtaler med udlejere vil vises her
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <Card 
                key={`${conversation.propertyId}-${conversation.otherUser.id}`}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/bolig/${conversation.propertyId}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">
                        {conversation.propertyTitle}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Samtale med {conversation.otherUser.name || conversation.otherUser.email}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-semibold">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">
                        {conversation.lastMessage.senderId === user?.id ? 'Du' : conversation.otherUser.name || conversation.otherUser.email}:
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {conversation.lastMessage.content}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conversation.lastMessage.createdAt!).toLocaleDateString('da-DK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
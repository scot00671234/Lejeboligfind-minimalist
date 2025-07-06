import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageModal } from "@/components/message-modal";
import { useAuth } from "@/hooks/use-auth";
import { Bed, Square, MapPin, User, Check } from "lucide-react";
import type { PropertyWithUser } from "@shared/schema";

export default function PropertyDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [showMessageModal, setShowMessageModal] = useState(false);

  const { data: property, isLoading, error } = useQuery<PropertyWithUser>({
    queryKey: ["/api/properties", id],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${id}`);
      if (!response.ok) throw new Error("Failed to fetch property");
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-20 rounded" />
                <Skeleton className="h-20 rounded" />
                <Skeleton className="h-20 rounded" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive">
                {error?.message || "Bolig ikke fundet"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'apartment':
        return 'Lejlighed';
      case 'house':
        return 'Hus';
      case 'room':
        return 'Værelse';
      default:
        return type;
    }
  };

  const getAreaFromAddress = (address: string) => {
    // Extract area/district from address, removing specific street details
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim(); // Return last part (city/area)
    }
    // If no comma, try to extract city/area from the end
    const words = address.split(' ');
    if (words.length >= 2) {
      return words[words.length - 1]; // Return last word (likely city)
    }
    return address; // Fallback
  };

  const canContactLandlord = isAuthenticated && user?.id !== property.userId;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {(property.imageUrl || (property.imageUrls && property.imageUrls.length > 0)) ? (
                <img 
                  src={property.imageUrl || property.imageUrls?.[0]} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground">Intet billede</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded border border-border flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">+{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-semibold text-foreground">
                  {property.title}
                </h1>
                <Badge variant="secondary">
                  {getTypeLabel(property.type)}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(property.price)}
                </span>
                <span className="text-muted-foreground">pr. måned</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{getAreaFromAddress(property.address)}</span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{property.rooms} værelser</span>
                  </div>
                  <div className="flex items-center">
                    <Square className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{property.size} m²</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beskrivelse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {property.description}
                </p>
              </CardContent>
            </Card>
            

            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Udlejer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{property.user.name}</p>
                    <p className="text-sm text-muted-foreground">Udlejer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {canContactLandlord && (
              <Button 
                className="w-full" 
                onClick={() => setShowMessageModal(true)}
              >
                Kontakt udlejer
              </Button>
            )}
            
            {!isAuthenticated && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground mb-2">
                    Log ind for at kontakte udlejeren
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {canContactLandlord && (
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          propertyId={property.id}
          receiverId={property.userId}
        />
      )}
    </div>
  );
}

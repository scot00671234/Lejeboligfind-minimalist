import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Square, MapPin } from "lucide-react";
import type { PropertyWithUser } from "@shared/schema";
import { Link } from "wouter";

interface PropertyCardProps {
  property: PropertyWithUser;
}

export function PropertyCard({ property }: PropertyCardProps) {
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

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
        {(property.imageUrl || (property.imageUrls && property.imageUrls.length > 0)) ? (
          <img 
            src={property.imageUrl || property.imageUrls?.[0]} 
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">Intet billede</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-foreground line-clamp-2">
            {property.title}
          </h3>
          <span className="text-lg font-semibold text-primary whitespace-nowrap ml-2">
            {formatPrice(property.price)}
          </span>
        </div>
        
        <div className="flex items-center text-muted-foreground text-sm mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">{getAreaFromAddress(property.address)}</span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <Bed className="h-4 w-4" />
            <span>{property.rooms} værelser</span>
          </div>
          <div className="flex items-center space-x-1">
            <Square className="h-4 w-4" />
            <span>{property.size} m²</span>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {getTypeLabel(property.type)}
          </Badge>
        </div>
        
        <Link href={`/bolig/${property.id}`}>
          <Button className="w-full">
            Se detaljer
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

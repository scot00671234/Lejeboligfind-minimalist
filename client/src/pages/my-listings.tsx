import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Eye, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import type { Property } from "@shared/schema";

export default function MyListings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Adgang nægtet",
        description: "Du skal være logget ind for at se dine boliger",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate, toast]);

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/my-properties", user?.id],
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh data
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Bolig slettet",
        description: "Din bolig er blevet slettet",
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

  if (isLoading || propertiesLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-24 w-24 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-light text-foreground">Mine boliger</h1>
          <Link href="/opret-bolig">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Opret ny bolig
            </Button>
          </Link>
        </div>

        {!properties || properties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Du har ingen boliger endnu
              </p>
              <Link href="/opret-bolig">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Opret din første bolig
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <Card key={property.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden">
                        {property.imageUrl ? (
                          <img 
                            src={property.imageUrl} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-muted-foreground text-xs">
                              Intet billede
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-foreground mb-1">
                          {property.title}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-2">
                          {property.address}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{property.rooms} værelser</span>
                          <span>{property.size} m²</span>
                          <Badge variant="secondary">
                            {getTypeLabel(property.type)}
                          </Badge>
                          <Badge variant={property.available ? "default" : "secondary"}>
                            {property.available ? "Tilgængelig" : "Ikke tilgængelig"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-primary">
                          {formatPrice(property.price)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          pr. måned
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Link href={`/bolig/${property.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      <Link href={`/rediger-bolig/${property.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slet bolig</AlertDialogTitle>
                            <AlertDialogDescription>
                              Er du sikker på, at du vil slette "{property.title}"? 
                              Denne handling kan ikke fortrydes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuller</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProperty.mutate(property.id)}
                              disabled={deleteProperty.isPending}
                            >
                              {deleteProperty.isPending ? "Sletter..." : "Slet bolig"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

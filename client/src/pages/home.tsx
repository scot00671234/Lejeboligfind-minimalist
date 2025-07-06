import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/search-bar";
import { PropertyCard } from "@/components/property-card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import type { PropertyWithUser, PropertySearch } from "@shared/schema";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState<PropertySearch>({});

  const { data: properties, isLoading } = useQuery<PropertyWithUser[]>({
    queryKey: ["/api/properties", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.query) params.append("query", search.query);
      if (search.type) params.append("type", search.type);
      if (search.minPrice) params.append("minPrice", search.minPrice.toString());
      if (search.maxPrice) params.append("maxPrice", search.maxPrice.toString());
      if (search.minRooms) params.append("minRooms", search.minRooms.toString());
      if (search.maxRooms) params.append("maxRooms", search.maxRooms.toString());
      
      const response = await fetch(`/api/properties?${params}`);
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    },
  });

  const handleSearch = (searchParams: PropertySearch) => {
    setSearch(searchParams);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-muted py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl lg:text-4xl font-light text-foreground mb-4">
              Find din næste bolig
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Søg blandt tusindvis af lejeboliger i hele Danmark
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Property Listings */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-light text-foreground">Aktuelle boliger</h2>
            {isAuthenticated && (
              <Link href="/opret-bolig">
                <Button>Opret boligopslag</Button>
              </Link>
            )}
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Ingen boliger fundet. Prøv at justere dine søgekriterier.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import type { PropertySearch } from "@shared/schema";

interface SearchBarProps {
  onSearch: (search: PropertySearch) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const handleSearch = () => {
    const search: PropertySearch = {
      query: query || undefined,
      type: type as any || undefined,
    };

    if (priceRange) {
      if (priceRange === "0-5000") {
        search.minPrice = 0;
        search.maxPrice = 5000;
      } else if (priceRange === "5000-10000") {
        search.minPrice = 5000;
        search.maxPrice = 10000;
      } else if (priceRange === "10000-15000") {
        search.minPrice = 10000;
        search.maxPrice = 15000;
      } else if (priceRange === "15000+") {
        search.minPrice = 15000;
      }
    }

    onSearch(search);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Område, by eller postnummer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="focus:ring-primary"
            />
          </div>
          <div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Boligtype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Lejlighed</SelectItem>
                <SelectItem value="house">Hus</SelectItem>
                <SelectItem value="room">Værelse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Pris" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-5000">0 - 5.000 kr</SelectItem>
                <SelectItem value="5000-10000">5.000 - 10.000 kr</SelectItem>
                <SelectItem value="10000-15000">10.000 - 15.000 kr</SelectItem>
                <SelectItem value="15000+">15.000+ kr</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleSearch} className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Søg bolig</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

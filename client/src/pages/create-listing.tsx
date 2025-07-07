import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertPropertySchema } from "@shared/schema";
import type { InsertProperty } from "@shared/schema";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";

export default function CreateListing() {
  const { id } = useParams();
  const isEditing = !!id;
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Load existing property data for editing
  const { data: existingProperty, isLoading: loadingProperty } = useQuery({
    queryKey: ['/api/properties', id],
    enabled: isEditing && !!id,
  }) as { data: any, isLoading: boolean };

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      price: 0,
      size: 0,
      rooms: 1,
      type: "apartment",
      imageUrl: "",
      available: true,
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Adgang nægtet",
        description: "Du skal være logget ind for at oprette boliger",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate, toast]);

  // Update form with existing property data for editing
  useEffect(() => {
    if (existingProperty && isEditing) {
      form.reset({
        title: existingProperty.title,
        description: existingProperty.description,
        address: existingProperty.address,
        price: existingProperty.price,
        rooms: existingProperty.rooms,
        size: existingProperty.size,
        type: existingProperty.type,
        available: existingProperty.available,
      });
      if (existingProperty.imageUrls) {
        setImageUrls(existingProperty.imageUrls);
      }
    }
  }, [existingProperty, isEditing, form]);

  const createProperty = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const url = isEditing ? `/api/properties/${id}` : "/api/properties";
      const method = isEditing ? "PATCH" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-properties"] });
      toast({
        title: isEditing ? "Bolig opdateret" : "Bolig oprettet",
        description: isEditing ? "Dine ændringer er gemt" : "Din bolig er nu tilgængelig for lejere",
      });
      navigate(`/bolig/${property.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      console.log("Starting file upload process for", e.target.files.length, "files");
      setSelectedFiles(e.target.files);
      
      // Upload files to server and get URLs
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(e.target.files)) {
        try {
          console.log("Processing file:", file.name);
          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const base64 = await base64Promise;
          
          // Upload to server
          console.log("Uploading file to server...");
          const response = await apiRequest("POST", "/api/upload", { image: base64 });
          const result = await response.json();
          console.log("Upload successful, received URL:", result.imageUrl);
          uploadedUrls.push(result.imageUrl);
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "Fejl ved upload",
            description: "Kunne ikke uploade billede",
            variant: "destructive",
          });
        }
      }
      
      console.log("All uploads complete. Adding URLs to state:", uploadedUrls);
      setImageUrls(prev => {
        const newUrls = [...prev, ...uploadedUrls];
        console.log("Updated imageUrls state:", newUrls);
        return newUrls;
      });
    }
  };

  const removeImageUrl = (url: string) => {
    setImageUrls(imageUrls.filter(u => u !== url));
  };

  const onSubmit = async (data: InsertProperty) => {
    console.log("Form submission debug:", {
      imageUrlsState: imageUrls,
      imageUrlsLength: imageUrls.length,
      firstImageUrl: imageUrls[0],
      formData: data
    });
    
    // Ensure we have the latest image URLs
    const currentImageUrls = [...imageUrls];
    
    const propertyData: InsertProperty = {
      ...data,
      imageUrl: currentImageUrls.length > 0 ? currentImageUrls[0] : undefined,
      imageUrls: currentImageUrls.length > 0 ? currentImageUrls : undefined,
    };
    
    console.log("Property data being sent:", propertyData);
    createProperty.mutate(propertyData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Rediger bolig' : 'Opret boligopslag'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <Input placeholder="F.eks. Lys 3-værelses lejlighed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="Gade, by, postnummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Boligtype</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vælg type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apartment">Lejlighed</SelectItem>
                            <SelectItem value="house">Hus</SelectItem>
                            <SelectItem value="room">Værelse</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Størrelse (m²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="85" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antal værelser</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Månedlig husleje (kr)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="12500" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivelse</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv din bolig..." 
                          rows={4} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File upload for images */}
                <div className="space-y-3">
                  <FormLabel>Billeder (valgfrit)</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0"
                            onClick={() => removeImageUrl(url)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/")}
                  >
                    Annuller
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProperty.isPending}
                  >
                    {createProperty.isPending ? "Opretter..." : "Opret opslag"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

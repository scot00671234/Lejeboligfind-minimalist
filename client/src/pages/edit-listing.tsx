import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, X } from "lucide-react";
import { insertPropertySchema, type InsertProperty, type PropertyWithUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export default function EditListing() {
  const { id } = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: property, isLoading: propertyLoading } = useQuery<PropertyWithUser>({
    queryKey: ["/api/properties", id],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${id}`);
      if (!response.ok) throw new Error("Failed to fetch property");
      return response.json();
    },
    enabled: !!id && isAuthenticated,
  });

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      address: "",
      rooms: 1,
      size: 0,
      type: "apartment",
      available: true,
      imageUrl: "",
    },
  });

  // Update form when property data loads
  useEffect(() => {
    if (property) {
      form.reset({
        title: property.title,
        description: property.description,
        price: property.price,
        address: property.address,
        rooms: property.rooms,
        size: property.size,
        type: property.type,
        available: property.available,
        imageUrl: property.imageUrl || "",
      });
      if (property.imageUrl) {
        setImagePreview(property.imageUrl);
      }
    }
  }, [property, form]);

  const updateProperty = useMutation({
    mutationFn: async (data: InsertProperty) => {
      let finalData = { ...data };
      
      if (imageFile) {
        // Convert image to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        
        const base64Image = await base64Promise;
        
        const uploadResponse = await apiRequest("POST", "/api/upload", {
          image: base64Image,
        });
        
        if (uploadResponse.ok) {
          const { imageUrl } = await uploadResponse.json();
          finalData.imageUrl = imageUrl;
        }
      }
      
      await apiRequest("PUT", `/api/properties/${id}`, finalData);
    },
    onSuccess: () => {
      toast({
        title: "Bolig opdateret",
        description: "Din bolig er blevet opdateret succesfuldt",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-properties"] });
      navigate("/mine-boliger");
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    form.setValue("imageUrl", "");
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Adgang nægtet",
        description: "Du skal være logget ind for at redigere boliger",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate, toast]);

  // Check property ownership after data loads
  useEffect(() => {
    if (property && user && property.userId !== user.id) {
      toast({
        title: "Adgang nægtet",
        description: "Du kan kun redigere dine egne boliger",
        variant: "destructive",
      });
      navigate("/mine-boliger");
    }
  }, [property, user, navigate, toast]);

  if (isLoading || propertyLoading) {
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

  if (!isAuthenticated || !property) {
    return null;
  }

  const onSubmit = (data: InsertProperty) => {
    updateProperty.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/mine-boliger")}
            className="flex items-center space-x-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tilbage til mine boliger</span>
          </Button>
          <h1 className="text-3xl font-light text-foreground">Rediger bolig</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Boligoplysninger</CardTitle>
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
                        <Input {...field} />
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
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pris (kr/måned)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antal værelser</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
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
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormLabel>Billede</FormLabel>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {imagePreview ? 'Skift billede' : 'Upload billede'}
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Tilgængelig for leje</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateProperty.isPending}
                >
                  {updateProperty.isPending ? "Opdaterer..." : "Opdater bolig"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
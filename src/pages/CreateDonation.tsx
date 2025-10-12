import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  ArrowLeft, 
  Apple, 
  UtensilsCrossed, 
  Package, 
  Cake, 
  Milk, 
  Snowflake, 
  Coffee,
  Wheat,
  Candy,
  Wine,
  Droplet,
  Baby,
  MoreHorizontal
} from "lucide-react";

export default function CreateDonation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    food_type: "",
    quantity: "",
    unit: "kg",
    expiration_date: "",
    pickup_location: "",
    pickup_time_start: "",
    pickup_time_end: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let image_url = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('food-images')
          .getPublicUrl(filePath);

        image_url = publicUrl;
      }

      const { error } = await supabase.from("food_donations").insert({
        donor_id: user.id,
        title: formData.title,
        description: formData.description,
        food_type: formData.food_type,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expiration_date: formData.expiration_date,
        pickup_location: formData.pickup_location,
        pickup_time_start: formData.pickup_time_start,
        pickup_time_end: formData.pickup_time_end,
        image_url,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Food donation posted successfully",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Post Food Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Fresh vegetables from farmer's market"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Additional details about the food..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="food_type">Food Type *</Label>
                <Select
                  value={formData.food_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, food_type: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select food type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="produce">
                      <div className="flex items-center justify-between w-full">
                        <span>Produce (Fruits & Vegetables)</span>
                        <Apple className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="prepared">
                      <div className="flex items-center justify-between w-full">
                        <span>Prepared Vegetarian Food</span>
                        <UtensilsCrossed className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="packaged">
                      <div className="flex items-center justify-between w-full">
                        <span>Packaged Goods</span>
                        <Package className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="bakery">
                      <div className="flex items-center justify-between w-full">
                        <span>Bakery & Bread</span>
                        <Cake className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="dairy">
                      <div className="flex items-center justify-between w-full">
                        <span>Dairy & Eggs</span>
                        <Milk className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="frozen">
                      <div className="flex items-center justify-between w-full">
                        <span>Frozen Vegetarian Foods</span>
                        <Snowflake className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="canned">
                      <div className="flex items-center justify-between w-full">
                        <span>Canned Goods</span>
                        <Coffee className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="grains">
                      <div className="flex items-center justify-between w-full">
                        <span>Grains & Pasta</span>
                        <Wheat className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="snacks">
                      <div className="flex items-center justify-between w-full">
                        <span>Snacks & Desserts</span>
                        <Candy className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="beverages">
                      <div className="flex items-center justify-between w-full">
                        <span>Beverages</span>
                        <Wine className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="condiments">
                      <div className="flex items-center justify-between w-full">
                        <span>Condiments & Sauces</span>
                        <Droplet className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="baby">
                      <div className="flex items-center justify-between w-full">
                        <span>Baby Food</span>
                        <Baby className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center justify-between w-full">
                        <span>Other</span>
                        <MoreHorizontal className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="lbs">Pounds</SelectItem>
                      <SelectItem value="servings">Servings</SelectItem>
                      <SelectItem value="items">Items</SelectItem>
                      <SelectItem value="boxes">Boxes</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="gallons">Gallons</SelectItem>
                      <SelectItem value="portions">Portions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="expiration_date">Expiration Date *</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  required
                  value={formData.expiration_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiration_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="pickup_location">Pickup Location *</Label>
                <Input
                  id="pickup_location"
                  required
                  value={formData.pickup_location}
                  onChange={(e) =>
                    setFormData({ ...formData, pickup_location: e.target.value })
                  }
                  placeholder="Street address or landmark"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickup_time_start">Pickup Start Time *</Label>
                  <Input
                    id="pickup_time_start"
                    type="datetime-local"
                    required
                    value={formData.pickup_time_start}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_time_start: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pickup_time_end">Pickup End Time *</Label>
                  <Input
                    id="pickup_time_end"
                    type="datetime-local"
                    required
                    value={formData.pickup_time_end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_time_end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image">Food Image</Label>
                <div className="mt-2">
                  <label
                    htmlFor="image"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    {imageFile ? (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          {imageFile.name}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload image
                        </p>
                      </div>
                    )}
                  </label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setImageFile(file);
                    }}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Posting..." : "Post Donation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

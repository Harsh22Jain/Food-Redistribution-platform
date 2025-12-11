import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowLeft } from "lucide-react";


const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setAddress(profile.address || "");
        setOrganizationName(profile.organization_name || "");
      }
    };

    loadProfile();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          address,
          organization_name: organizationName,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="mb-8 flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account information</p>
            </div>
          </div>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name (Optional)</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;

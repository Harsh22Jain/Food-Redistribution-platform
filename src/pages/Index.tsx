import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Truck, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import heroImage from "@/assets/hero-food-sharing.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 -z-10" />
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Share Food,
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Feed Hope
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Connect food donors with those in need. Our smart matching system ensures surplus food reaches the right people at the right time.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent shadow-medium">
                  <Link to="/auth?mode=signup">Get Started</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/browse">Browse Food</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src={heroImage}
                alt="Community food sharing"
                className="rounded-2xl shadow-strong w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How FoodShare Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our platform makes food redistribution simple, efficient, and impactful
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Donate Food</CardTitle>
                <CardDescription>
                  Restaurants, grocers, and individuals can list surplus food with photos and details
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Smart Matching</CardTitle>
                <CardDescription>
                  Our AI matches donations to recipients based on location, need, and preferences
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Truck className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Coordinate Pickup</CardTitle>
                <CardDescription>
                  Schedule convenient pickup times or arrange volunteer delivery services
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Track Impact</CardTitle>
                <CardDescription>
                  Real-time notifications and tracking ensure food reaches those who need it
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="border-none bg-gradient-to-r from-primary to-accent text-white shadow-strong">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Make a Difference?
              </h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
                Join our community of donors, recipients, and volunteers working together to end food waste and hunger.
              </p>
              <Button asChild size="lg" variant="secondary" className="shadow-medium">
                <Link to="/auth?mode=signup">Join FoodShare Today</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;

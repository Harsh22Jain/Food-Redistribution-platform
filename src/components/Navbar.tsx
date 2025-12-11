import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/nourishnet-logo.png";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/browse", label: "Browse" },
    { to: "/matches", label: "Matches" },
    { to: "/reviews", label: "Reviews" },
  ];

  return (
    <motion.nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-background/95 backdrop-blur-lg border-b border-border shadow-soft" 
          : "bg-background/80 backdrop-blur-md border-b border-border"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-bold text-xl">
          <motion.img 
            src={logo} 
            alt="NourishNet Logo" 
            className="h-10 w-10"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.span 
            className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            whileHover={{ scale: 1.05 }}
          >
            NourishNet
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Button asChild variant="ghost" className="relative group">
                    <Link to={link.to}>
                      {link.label}
                      <motion.span 
                        className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-left"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    </Link>
                  </Button>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button asChild variant="ghost" className="relative group">
                  <Link to="/profile">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                    <motion.span 
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </Link>
                </Button>
              </motion.div>
              <NotificationBell />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button asChild className="bg-gradient-to-r from-primary to-accent">
                  <Link to="/auth?mode=signup">Get Started</Link>
                </Button>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-muted"
            whileTap={{ scale: 0.95 }}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden bg-background border-b border-border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {user ? (
                <>
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button 
                        asChild 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link to={link.to}>{link.label}</Link>
                      </Button>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Button 
                      asChild 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/profile">
                        <UserIcon className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Button 
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }} 
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Button 
                      asChild 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/auth">Sign In</Link>
                    </Button>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Button 
                      asChild 
                      className="w-full bg-gradient-to-r from-primary to-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/auth?mode=signup">Get Started</Link>
                    </Button>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;

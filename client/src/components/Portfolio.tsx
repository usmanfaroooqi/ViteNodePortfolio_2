import { useState, useEffect } from "react";
import { Section, FadeIn } from "@/components/ui/layout-components";
import { CATEGORIES } from "@/data/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trash2, Settings, Folder, Image as ImageIcon, X, AlertTriangle, Loader2, Link as LinkIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Firebase Imports
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc
} from "firebase/firestore";

// Types
export interface Repository {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  createdAt: any;
}

export function Portfolio() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [manualRepoImage, setManualRepoImage] = useState("");

  const [newRepo, setNewRepo] = useState<Partial<Repository>>({
    title: "", description: "", category: "Branding", coverImage: ""
  });

  const handleLogin = () => {
    const adminMode = localStorage.getItem("adminMode") === "true";
    if (adminMode) {
      setIsEditMode(true);
      setIsAuthenticated(true);
    }
  };

  useEffect(() => {
    handleLogin();
  }, []);

  const handleChangePassword = async () => {
      try {
        const settingsRef = doc(db, "settings", "admin");
        const snap = await getDoc(settingsRef);
        const storedPassword = snap.exists() ? snap.data().password : "usman2006";
        
        if (currentPasswordInput !== storedPassword) {
            toast({ title: "Error", description: "Current password incorrect.", variant: "destructive" });
            return;
        }
        if (newPasswordInput.length < 4) {
            toast({ title: "Error", description: "New password must be at least 4 characters.", variant: "destructive" });
            return;
        }
        await setDoc(settingsRef, { password: newPasswordInput });
        toast({ title: "Success", description: "Password updated successfully." });
        setChangePasswordOpen(false);
        setCurrentPasswordInput("");
        setNewPasswordInput("");
      } catch (error) {
        toast({ title: "Error", description: "Failed to update password.", variant: "destructive" });
      }
  };

  // --- Firebase: Listen to Repositories ---
  useEffect(() => {
    const q = query(collection(db, "repositories"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const repos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Repository));
        setRepositories(repos);
        setLoading(false);
        setFirebaseError(null);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
        if (error.code === 'permission-denied') {
           setFirebaseError("Permission denied. Check Firebase Console settings.");
        } else if (error.code === 'unavailable') {
           console.log("Network unavailable, using cached data if available.");
        } else {
           setFirebaseError(`Database Error: ${error.message}`);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Repository Management ---
  const handleAddRepository = async () => {
    const finalCoverImage = manualRepoImage;

    if (!newRepo.title || !finalCoverImage) {
      toast({ title: "Error", description: "Title and Cover Image URL are required.", variant: "destructive" });
      return;
    }
    
    try {
      await addDoc(collection(db, "repositories"), {
        title: newRepo.title,
        description: newRepo.description || "",
        category: newRepo.category || "Branding",
        coverImage: finalCoverImage,
        createdAt: serverTimestamp()
      });

      setNewRepo({ title: "", description: "", category: "Branding", coverImage: "" });
      setManualRepoImage("");
      setNewRepoOpen(false);
      toast({ title: "Success", description: "Repository created." });
    } catch (error: any) {
      console.error("Error adding repo: ", error);
      toast({ title: "Error", description: `Failed to create repository: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteRepository = async (id: string) => {
    if (confirm("Delete this repository?")) {
      try {
        await deleteDoc(doc(db, "repositories", id));
        toast({ title: "Deleted", description: "Repository removed." });
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete repository.", variant: "destructive" });
      }
    }
  };

  const filteredRepos = activeCategory === "All" 
    ? repositories 
    : repositories.filter(r => r.category === activeCategory);

  return (
    <Section id="portfolio" className="bg-gradient-to-br from-white/5 via-white/2 to-transparent rounded-3xl my-20 border border-white/10 shadow-lg backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex justify-between items-end mb-12">
        <div></div>
        <div className="flex gap-2">
            {isEditMode && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-foreground gap-2 transition-colors"
                    onClick={() => setChangePasswordOpen(true)}
                >
                    Change Password
                </Button>
            )}
            <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-xs gap-2 transition-all duration-300",
              isEditMode 
                ? "text-foreground bg-primary/10 hover:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            onClick={() => {
                if (isEditMode) {
                    setIsEditMode(false);
                    setIsAuthenticated(false);
                    localStorage.removeItem("adminMode");
                } else {
                    setLocation("/admin");
                }
            }}
            >
            <Settings className="w-3 h-3" /> {isEditMode ? "Exit Admin" : "Admin"}
            </Button>
        </div>

        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
            <DialogContent className="sm:max-w-[425px] bg-background border-white/10">
                <DialogTitle className="text-foreground">Change Admin Password</DialogTitle>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label className="text-foreground">Current Password</Label>
                        <Input 
                            type="password" 
                            value={currentPasswordInput}
                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                            className="bg-background/50 border-white/10 text-foreground"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-foreground">New Password</Label>
                        <Input 
                            type="password" 
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            className="bg-background/50 border-white/10 text-foreground"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleChangePassword} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Update Password
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
            <DialogContent className="sm:max-w-[425px] bg-background border-white/10">
                <DialogTitle className="text-foreground">Admin Login</DialogTitle>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label className="text-foreground">Password</Label>
                        <Input 
                            type="password" 
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            className="bg-background/50 border-white/10 text-foreground"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Login
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      {firebaseError && (
         <FadeIn>
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-lg mb-8 text-sm text-center flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Database Error</span>
            </div>
            <p className="opacity-80">{firebaseError}</p>
          </div>
        </FadeIn>
      )}

      {isEditMode && !firebaseError && (
        <FadeIn>
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-4 rounded-lg mb-8 text-sm text-center flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 font-bold">
              <Folder className="w-4 h-4" />
              <span>Admin Mode Active</span>
            </div>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Portfolio Collections</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Curated selection of creative works and projects
          </p>
        </div>
      </FadeIn>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}

      {!loading && (
        <>
          <FadeIn delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 border",
                    activeCategory === category 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                      : "bg-background/50 border-white/10 text-muted-foreground hover:bg-background/80 hover:text-foreground hover:scale-105"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Add New Repository Card */}
            {isEditMode && (
              <Dialog open={newRepoOpen} onOpenChange={setNewRepoOpen}>
                <DialogTrigger asChild>
                  <div className="group cursor-pointer border-2 border-dashed border-white/20 hover:border-primary rounded-2xl aspect-[4/3] flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-500 bg-background/30 hover:bg-background/50">
                    <div className="relative">
                      <Folder className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform duration-300" />
                      <Plus className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full p-1" />
                    </div>
                    <span className="font-medium text-lg">Create Collection</span>
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-background border-white/10 max-h-[90vh] overflow-y-auto">
                  <DialogTitle className="text-foreground text-2xl">Create New Collection</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Collections organize your projects and work.
                  </DialogDescription>
                  <div className="grid gap-6 py-6">
                    <div className="grid gap-3">
                      <Label className="text-foreground text-sm font-medium">Collection Title *</Label>
                      <Input 
                        value={newRepo.title} 
                        onChange={(e) => setNewRepo({...newRepo, title: e.target.value})}
                        placeholder="e.g. Brand Identity 2024" 
                        className="bg-background/50 border-white/10 text-foreground"
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-foreground text-sm font-medium">Category</Label>
                      <select 
                        className="flex h-12 w-full rounded-lg border border-white/10 bg-background/50 px-4 py-2 text-foreground text-sm"
                        value={newRepo.category}
                        onChange={(e) => setNewRepo({...newRepo, category: e.target.value})}
                      >
                        {CATEGORIES.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-foreground text-sm font-medium">Cover Image URL *</Label>
                      <Input 
                        placeholder="https://example.com/cover-image.jpg" 
                        value={manualRepoImage}
                        onChange={(e) => {
                            setManualRepoImage(e.target.value);
                            setNewRepo({...newRepo, coverImage: e.target.value}); 
                        }}
                        className="bg-background/50 border-white/10 text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">Must be a direct image link ending in .jpg, .png, or .webp</p>
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-foreground text-sm font-medium">Description</Label>
                      <Textarea 
                        value={newRepo.description}
                        onChange={(e) => setNewRepo({...newRepo, description: e.target.value})}
                        placeholder="Describe this collection..."
                        rows={3}
                        className="bg-background/50 border-white/10 text-foreground resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setNewRepoOpen(false)} className="border-white/10">Cancel</Button>
                    <Button onClick={handleAddRepository} className="bg-primary text-primary-foreground hover:bg-primary/90">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Repositories */}
            {filteredRepos.map((repo, index) => (
              <FadeIn key={repo.id} delay={index * 0.1} className="group relative h-80">
                {isEditMode && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-4 right-4 z-50 h-8 w-8"
                    onClick={() => handleDeleteRepository(repo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                
                <div 
                  onClick={() => setLocation(`/repo/${repo.id}`)}
                  className="cursor-pointer relative w-full h-full overflow-hidden rounded-2xl bg-background border border-white/5"
                >
                  <img 
                    src={repo.coverImage} 
                    alt={repo.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-foreground font-display font-bold text-2xl mb-2">{repo.title}</h3>
                    <p className="text-muted-foreground text-sm">{repo.category}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

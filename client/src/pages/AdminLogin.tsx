import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/portfolio";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, setDoc } from "firebase/firestore";

interface Repository {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  createdAt: any;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [manualRepoImage, setManualRepoImage] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const [newRepo, setNewRepo] = useState<Partial<Repository>>({
    title: "", description: "", category: "Branding", coverImage: ""
  });

  useEffect(() => {
    const adminMode = localStorage.getItem("adminMode") === "true";
    setIsAuthenticated(adminMode);
    if (adminMode) {
      loadRepositories();
    }
  }, []);

  const getAdminPassword = async () => {
    try {
      const settingsRef = doc(db, "settings", "admin");
      const snap = await getDoc(settingsRef);
      return snap.exists() ? snap.data().password : "usman2006";
    } catch (error) {
      console.error("Error fetching password:", error);
      return "usman2006";
    }
  };

  const loadRepositories = () => {
    setLoading(true);
    const q = query(collection(db, "repositories"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const repos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Repository));
        setRepositories(repos);
        setLoading(false);
      }
    );
    return unsubscribe;
  };

  const handleLogin = async () => {
    const storedPassword = await getAdminPassword();
    if (adminPassword === storedPassword) {
      localStorage.setItem("adminMode", "true");
      setIsAuthenticated(true);
      setAdminPassword("");
      toast({ title: "Success", description: "Admin mode enabled." });
      loadRepositories();
    } else {
      toast({ title: "Error", description: "Invalid password", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminMode");
    setIsAuthenticated(false);
    setAdminPassword("");
    setLocation("/");
    toast({ title: "Logged out", description: "Admin mode disabled." });
  };

  const handleAddRepository = async () => {
    if (!newRepo.title || !manualRepoImage) {
      toast({ title: "Error", description: "Title and Cover Image URL are required.", variant: "destructive" });
      return;
    }
    
    try {
      await addDoc(collection(db, "repositories"), {
        title: newRepo.title,
        description: newRepo.description || "",
        category: newRepo.category || "Branding",
        coverImage: manualRepoImage,
        createdAt: serverTimestamp()
      });

      setNewRepo({ title: "", description: "", category: "Branding", coverImage: "" });
      setManualRepoImage("");
      setNewRepoOpen(false);
      toast({ title: "Success", description: "Repository created." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const handleChangePassword = async () => {
    const storedPassword = await getAdminPassword();
    if (currentPasswordInput !== storedPassword) {
      toast({ title: "Error", description: "Current password incorrect.", variant: "destructive" });
      return;
    }
    if (newPasswordInput.length < 4) {
      toast({ title: "Error", description: "New password must be at least 4 characters.", variant: "destructive" });
      return;
    }
    try {
      const settingsRef = doc(db, "settings", "admin");
      await setDoc(settingsRef, { password: newPasswordInput });
      toast({ title: "Success", description: "Password updated successfully." });
      setChangePasswordOpen(false);
      setCurrentPasswordInput("");
      setNewPasswordInput("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to update password.", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="mb-8 text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Portfolio
          </Button>

          <div className="bg-background/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2 text-center">Admin Access</h1>
            <p className="text-muted-foreground text-center mb-8">Enter your password to access admin features</p>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-foreground">Password</Label>
                <Input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin?.()}
                  placeholder="Enter admin password"
                  className="bg-background/50 border-white/10 text-foreground"
                />
              </div>

              <Button 
                onClick={() => handleLogin()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Login
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setChangePasswordOpen(true)}
                className="w-full border-white/10"
              >
                Change Password
              </Button>
            </div>
          </div>

          {/* Change Password Dialog */}
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
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setChangePasswordOpen(false)} className="border-white/10">Cancel</Button>
                <Button onClick={() => handleChangePassword()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Update Password
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setChangePasswordOpen(true)}
            >
              Change Password
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              className="text-xs border-white/10"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Manage Collections</h2>
          <p className="text-muted-foreground">Create, edit, and manage your portfolio collections</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          </div>
        ) : (
          <>
            <Dialog open={newRepoOpen} onOpenChange={setNewRepoOpen}>
              <DialogTrigger asChild>
                <Button className="mb-12 bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  <Plus className="w-4 h-4" /> Create New Collection
                </Button>
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
                      onChange={(e) => setManualRepoImage(e.target.value)}
                      className="bg-background/50 border-white/10 text-foreground"
                    />
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

            <div className="space-y-4">
              {repositories.length === 0 ? (
                <div className="bg-background/50 border border-white/10 rounded-lg p-12 text-center">
                  <p className="text-muted-foreground">No collections yet. Create your first collection to get started.</p>
                </div>
              ) : (
                repositories.map((repo) => (
                  <div 
                    key={repo.id}
                    className="bg-background/50 border border-white/10 rounded-lg p-6 flex items-center justify-between hover:border-white/20 transition-colors"
                  >
                    <div className="flex-1 flex items-center gap-6">
                      <img 
                        src={repo.coverImage} 
                        alt={repo.title}
                        className="w-24 h-24 rounded-lg object-cover border border-white/10"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-display font-bold text-foreground mb-1">{repo.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{repo.description}</p>
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {repo.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/repo/${repo.id}`)}
                        className="border-white/10"
                      >
                        View
                      </Button>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRepository(repo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
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
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)} className="border-white/10">Cancel</Button>
            <Button onClick={handleChangePassword} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

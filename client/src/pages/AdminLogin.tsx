import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Plus, Loader2, Pencil } from "lucide-react"; // Added Pencil
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/portfolio";

import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore"; // Added updateDoc
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from "firebase/auth";

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
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Dashboard State
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);
  
  // Create State
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [manualRepoImage, setManualRepoImage] = useState("");
  const [newRepo, setNewRepo] = useState<Partial<Repository>>({
    title: "", description: "", category: "Branding", coverImage: ""
  });

  // Edit State (NEW)
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Password Change State
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // 1. Check Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        loadRepositories();
      } else {
        setIsAuthenticated(false);
        setRepositories([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadRepositories = () => {
    setRepoLoading(true);
    const q = query(collection(db, "repositories"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const repos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Repository));
        setRepositories(repos);
        setRepoLoading(false);
      }
    );
    return unsubscribe;
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, adminPassword);
      toast({ title: "Success", description: "Welcome back!" });
    } catch (error: any) {
      toast({ title: "Login Failed", description: "Invalid email or password", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLocation("/");
  };

  const handleAddRepository = async () => {
    if (!newRepo.title || !manualRepoImage) {
      toast({ title: "Error", description: "Title and Image are required.", variant: "destructive" });
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
      toast({ title: "Success", description: "Collection created." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // NEW: Handle Update
  const handleUpdateRepository = async () => {
    if (!editingRepo || !editingRepo.title) return;

    try {
      const docRef = doc(db, "repositories", editingRepo.id);
      await updateDoc(docRef, {
        title: editingRepo.title,
        description: editingRepo.description,
        category: editingRepo.category,
        coverImage: editingRepo.coverImage
      });

      setEditDialogOpen(false);
      setEditingRepo(null);
      toast({ title: "Updated", description: "Changes saved successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  // NEW: Open Edit Dialog
  const openEditDialog = (repo: Repository) => {
    setEditingRepo(repo);
    setEditDialogOpen(true);
  };

  const handleDeleteRepository = async (id: string) => {
    if (confirm("Delete this repository?")) {
      try {
        await deleteDoc(doc(db, "repositories", id));
        toast({ title: "Deleted", description: "Repository removed." });
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
      }
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (user && newPasswordInput.length >= 6) {
      try {
        await updatePassword(user, newPasswordInput);
        toast({ title: "Success", description: "Password updated." });
        setChangePasswordOpen(false);
      } catch (error) {
        toast({ title: "Error", description: "Re-login required to change password.", variant: "destructive" });
      }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background/50 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          <div className="space-y-4">
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email" 
              className="bg-background/50 border-white/10"
            />
            <Input 
              type="password" 
              value={adminPassword} 
              onChange={(e) => setAdminPassword(e.target.value)} 
              placeholder="Password" 
              className="bg-background/50 border-white/10"
            />
            <Button onClick={handleLogin} className="w-full">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setChangePasswordOpen(true)}>Password</Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Collections</h2>
          <Dialog open={newRepoOpen} onOpenChange={setNewRepoOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Collection</Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-white/10">
              <DialogTitle>Create Collection</DialogTitle>
              <div className="grid gap-4 py-4">
                <Input placeholder="Title" value={newRepo.title} onChange={(e) => setNewRepo({...newRepo, title: e.target.value})} className="bg-background/50 border-white/10"/>
                <select className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3" value={newRepo.category} onChange={(e) => setNewRepo({...newRepo, category: e.target.value})}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input placeholder="Image URL" value={manualRepoImage} onChange={(e) => setManualRepoImage(e.target.value)} className="bg-background/50 border-white/10"/>
                <Textarea placeholder="Description" value={newRepo.description} onChange={(e) => setNewRepo({...newRepo, description: e.target.value})} className="bg-background/50 border-white/10"/>
                <Button onClick={handleAddRepository}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List Repos */}
        <div className="space-y-4">
          {repositories.map((repo) => (
            <div key={repo.id} className="bg-background/50 border border-white/10 rounded-lg p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={repo.coverImage} alt={repo.title} className="w-16 h-16 rounded object-cover" />
                <div>
                  <h3 className="font-bold">{repo.title}</h3>
                  <p className="text-sm text-muted-foreground">{repo.category}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setLocation(/repo/${repo.id})}>View</Button>
                
                {/* Edit Button */}
                <Button variant="secondary" size="sm" onClick={() => openEditDialog(repo)}>
                  <Pencil className="w-4 h-4" />
                </Button>

                <Button variant="destructive" size="sm" onClick={() => handleDeleteRepository(repo.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* EDIT DIALOG */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-background border-white/10">
            <DialogTitle>Edit Collection</DialogTitle>
            {editingRepo && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={editingRepo.title} 
                    onChange={(e) => setEditingRepo({...editingRepo, title: e.target.value})} 
                    className="bg-background/50 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 text-sm" 
                    value={editingRepo.category} 
                    onChange={(e) => setEditingRepo({...editingRepo, category: e.target.value})}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input 
                    value={editingRepo.coverImage} 
                    onChange={(e) => setEditingRepo({...editingRepo, coverImage: e.target.value})} 
                    className="bg-background/50 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={editingRepo.description} 
                    onChange={(e) => setEditingRepo({...editingRepo, description: e.target.value})} 
                    className="bg-background/50 border-white/10"
                  />
                </div>
                <Button onClick={handleUpdateRepository}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="bg-background border-white/10">
            <DialogTitle>Change Password</DialogTitle>
            <div className="grid gap-4 py-4">
              <Input type="password" placeholder="New Password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className="bg-background/50 border-white/10"/>
              <Button onClick={handleChangePassword}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

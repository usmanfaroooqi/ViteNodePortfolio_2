import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, X, Trash2, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

interface Project {
  id: string;
  title: string;
  description: string;
  images: string[];
  createdAt: any;
}

interface Repository {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  createdAt: any;
}

export default function Repository() {
  const params = useParams<{ repoId: string }>();
  const repoId = params?.repoId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [repo, setRepo] = useState<Repository | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectImageUrls, setProjectImageUrls] = useState<string[]>([""]); 

  const [newProject, setNewProject] = useState({ title: "", description: "" });

  useEffect(() => {
    if (!repoId) return;

    const repoDoc = doc(db, "repositories", repoId);
    const projectsRef = collection(db, "repositories", repoId, "projects");
    const projectsQuery = query(projectsRef, orderBy("createdAt", "desc"));

    const unsubRepo = onSnapshot(repoDoc, (snap) => {
      if (snap.exists()) {
        setRepo({ id: snap.id, ...snap.data() } as Repository);
      }
    });

    const unsubProjects = onSnapshot(projectsQuery, (snap) => {
      const projs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
      setProjects(projs);
      setLoading(false);
    });

    return () => {
      unsubRepo();
      unsubProjects();
    };
  }, [repoId]);

  const handleLogin = () => {
    const storedPassword = localStorage.getItem("adminPassword") || "usman2006";
    if (adminPassword === storedPassword) {
      setIsEditMode(true);
      setAuthOpen(false);
      toast({ title: "Success", description: "Admin mode enabled." });
    } else {
      toast({ title: "Error", description: "Invalid password", variant: "destructive" });
    }
  };

  const handleAddProject = async () => {
    const validImageUrls = projectImageUrls.filter(url => url.trim() !== "");
    
    if (!newProject.title || validImageUrls.length === 0) {
      toast({ title: "Error", description: "Title and at least one image URL required", variant: "destructive" });
      return;
    }

    try {
      const projectsRef = collection(db, "repositories", repoId, "projects");
      await addDoc(projectsRef, {
        title: newProject.title,
        description: newProject.description || "",
        images: validImageUrls,
        createdAt: serverTimestamp()
      });

      setNewProject({ title: "", description: "" });
      setProjectImageUrls([""]);
      setNewProjectOpen(false);
      toast({ title: "Success", description: "Project added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Delete this project?")) return;
    
    try {
      const projectRef = doc(db, "repositories", repoId, "projects", projectId);
      await deleteDoc(projectRef);
      toast({ title: "Deleted", description: "Project removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">Repository not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="text-white/70 hover:text-white gap-2 text-sm md:text-base"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white text-xs md:text-sm"
            onClick={() => setAuthOpen(true)}
          >
            {isEditMode ? "Exit" : "Admin"}
          </Button>
        </div>
      </div>

      {/* Hero Section - Premium */}
      <div className="relative h-64 md:h-96 lg:h-[28rem] overflow-hidden">
        <img 
          src={repo.coverImage} 
          alt={repo.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        {/* Content - Aligned & Centered */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-12 max-w-4xl">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-2 md:mb-4 leading-tight">
            {repo.title}
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl line-clamp-3">
            {repo.description}
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Add Project Card */}
          {isEditMode && (
            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <DialogTrigger asChild>
                <div className="group cursor-pointer border-2 border-dashed border-white/20 hover:border-primary rounded-2xl aspect-[4/3] flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-background/30 hover:bg-background/50">
                  <Plus className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">Add Project</p>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-background border-white/10 max-h-[90vh] overflow-y-auto">
                <DialogTitle className="text-foreground text-2xl">Add New Project</DialogTitle>
                <div className="grid gap-6 py-6">
                  <div className="grid gap-3">
                    <Label className="text-foreground">Title *</Label>
                    <Input 
                      value={newProject.title} 
                      onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                      placeholder="Project name"
                      className="bg-background/50 border-white/10 text-foreground"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-foreground">Description</Label>
                    <Textarea 
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      placeholder="Describe the project..."
                      className="bg-background/50 border-white/10 text-foreground"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-foreground">Image URLs *</Label>
                    {projectImageUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <Input 
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...projectImageUrls];
                            newUrls[i] = e.target.value;
                            setProjectImageUrls(newUrls);
                          }}
                          placeholder="https://example.com/image.jpg"
                          className="bg-background/50 border-white/10 text-foreground"
                        />
                        {projectImageUrls.length > 1 && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setProjectImageUrls(projectImageUrls.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {projectImageUrls.length < 7 && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => setProjectImageUrls([...projectImageUrls, ""])}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Add Image URL
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setNewProjectOpen(false)} className="border-white/10">Cancel</Button>
                  <Button onClick={handleAddProject} className="bg-primary text-primary-foreground hover:bg-primary/90">Add Project</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Projects */}
          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => setLocation(`/project/${repoId}/${project.id}`)}
              className="group cursor-pointer relative overflow-hidden rounded-2xl aspect-[4/3] bg-background border border-white/5 shadow-lg hover:shadow-2xl transition-all"
            >
              <img 
                src={project.images[0]} 
                alt={project.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-foreground font-display font-bold text-lg md:text-xl mb-1">{project.title}</h3>
                <p className="text-muted-foreground text-xs md:text-sm line-clamp-2">{project.description}</p>
              </div>

              {isEditMode && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3 z-50 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Admin Login Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
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
            <Button onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90">Login</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

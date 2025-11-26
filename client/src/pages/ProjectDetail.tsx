import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Loader2, Star, MessageCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface Project {
  id: string;
  title: string;
  description: string;
  images: string[];
  createdAt: any;
}

export default function ProjectDetail() {
  const params = useParams<{ repoId: string; projectId: string }>();
  const repoId = params?.repoId || "";
  const projectId = params?.projectId || "";
  const [, setLocation] = useLocation();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!repoId || !projectId) return;

    const fetchProject = async () => {
      try {
        const projectRef = doc(db, "repositories", repoId, "projects", projectId);
        const snap = await getDoc(projectRef);
        
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() } as Project);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching project:", error);
        setLoading(false);
      }
    };

    fetchProject();
  }, [repoId, projectId]);

  const handleInquire = () => {
    // Navigate to home and dispatch prefill event
    const event = new CustomEvent("prefillContact", {
      detail: { subject: `Inquiry about: ${project?.title}` }
    });
    
    setLocation("/");
    
    // Wait for navigation, then dispatch event and scroll
    setTimeout(() => {
      window.dispatchEvent(event);
      setTimeout(() => {
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation(`/repo/${repoId}`)}
            className="text-muted-foreground hover:text-foreground gap-2 text-sm md:text-base"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Main Image */}
        <div className="relative mb-8 md:mb-12 overflow-hidden rounded-2xl aspect-video bg-background/50">
          <img 
            src={project.images[selectedImageIndex]} 
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Gallery Thumbnails */}
        {project.images.length > 1 && (
          <div className="flex gap-3 md:gap-4 mb-8 md:mb-12 overflow-x-auto pb-2">
            {project.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`flex-shrink-0 h-16 md:h-20 w-20 md:w-24 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImageIndex === idx
                    ? "border-primary shadow-lg shadow-primary/50"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          <div className="lg:col-span-2">
            {/* Title & Description */}
            <div className="mb-8 md:mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4 md:mb-6 leading-tight">
                {project.title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {project.description}
              </p>
            </div>
          </div>

          {/* Sidebar - Premium CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-primary/10 border border-primary/30 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-foreground font-display font-bold text-lg">Interested?</h3>
                  <p className="text-muted-foreground text-sm">Let's discuss this project in detail</p>
                </div>
              </div>

              <Button 
                onClick={handleInquire}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 md:py-4 flex items-center justify-center gap-2 rounded-lg text-base md:text-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Inquire About This
              </Button>

              <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Images</p>
                  <p className="text-foreground font-display font-bold text-2xl">{project.images.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Images Grid */}
        {project.images.length > 1 && (
          <div className="mt-12 md:mt-16">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 md:mb-8">Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {project.images.slice(1).map((img, idx) => (
                <div 
                  key={idx}
                  className="relative overflow-hidden rounded-2xl aspect-video group cursor-pointer"
                  onClick={() => setSelectedImageIndex(idx + 1)}
                >
                  <img 
                    src={img} 
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

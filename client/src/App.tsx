import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the shape of your data
interface RepositoryData {
  title: string;
  description: string;
  category: string;
  coverImage: string;
}

export default function Repository() {
  // 1. MATCH THE PARAM NAME EXACTLY: "/repo/:repoId"
  const [match, params] = useRoute("/repo/:repoId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [repo, setRepo] = useState<RepositoryData | null>(null);

  useEffect(() => {
    // If no ID is found in the URL, go back home
    if (!match || !params?.repoId) {
      setLocation("/");
      return;
    }

    const fetchRepo = async () => {
      try {
        // 2. Use params.repoId (not params.id)
        const docRef = doc(db, "repositories", params.repoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRepo(docSnap.data() as RepositoryData);
        } else {
          toast({ 
            title: "Not Found", 
            description: "This collection does not exist.",
            variant: "destructive" 
          });
          setLocation("/");
        }
      } catch (error) {
        console.error("Error fetching repo:", error);
        toast({ title: "Error", description: "Could not load data." });
      } finally {
        setLoading(false);
      }
    };

    fetchRepo();
  }, [match, params, setLocation, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!repo) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Image */}
      <div className="w-full h-[40vh] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
        <img 
          src={repo.coverImage} 
          alt={repo.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute top-4 left-4 z-20">
           <Button variant="ghost" onClick={() => setLocation("/")} className="gap-2 backdrop-blur-md bg-black/20 text-white hover:bg-black/40">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-20 pb-20">
        <div className="bg-background/80 border border-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
                {repo.category}
              </span>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{repo.title}</h1>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {repo.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

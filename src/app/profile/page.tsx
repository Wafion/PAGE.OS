"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user } = useAuth();

  const handleSignIn = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-headline text-accent">USER_PROFILE / LOGIN</h1>
        <p className="text-muted-foreground">Operator session logs and preferences.</p>
      </div>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-lg text-accent/80">Data Sync</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback><UserIcon /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Connect to Firebase to synchronize your reading history, bookmarks, and preferences across all your devices.
              </p>
              <Button variant="outline" className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent" onClick={handleSignIn}>
                <LogIn className="mr-2 h-4 w-4"/> Connect with Google
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-lg text-accent/80">Export Data</CardTitle>
           <CardDescription>
            This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="border-border/50" disabled>
            <Download className="mr-2 h-4 w-4" /> EXPORT_PINS
          </Button>
          <Button variant="outline" className="border-border/50" disabled>
            <Download className="mr-2 h-4 w-4" /> EXPORT_COMPLETED_LOGS
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

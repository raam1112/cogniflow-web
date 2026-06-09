import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password — CogniFlow" },
      {
        name: "description",
        content:
          "Securely update your CogniFlow account password and regain access to your smart task manager.",
      },
      { property: "og:title", content: "Reset Password — CogniFlow" },
      {
        property: "og:description",
        content:
          "Securely update your CogniFlow account password and regain access to your smart task manager.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/app" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md border-2 border-border bg-card p-6 btn-brutal">
        <h1 className="font-display text-xl font-bold text-foreground">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter a new password for your account.</p>
        <div className="mt-6 space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="mt-6 w-full font-display font-bold uppercase btn-brutal">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type ContactMessage = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

const AdminMessages = () => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const toggleRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-messages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast({ title: "Message supprimé" });
    },
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
        <p>Aucun message de contact reçu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {messages.filter((m) => !m.is_read).length} non lu(s) sur {messages.length}
      </p>
      {messages.map((m) => (
        <div
          key={m.id}
          className={`bg-card p-4 rounded-lg border ${m.is_read ? "border-border" : "border-primary/30 bg-accent/30"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{m.name}</span>
                {!m.is_read && (
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Nouveau</span>
                )}
              </div>
              {m.subject && <p className="text-sm font-medium text-muted-foreground mb-1">{m.subject}</p>}
              <p className="text-sm mb-2">{m.message}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {m.email && <span>{m.email}</span>}
                {m.phone && <span>{m.phone}</span>}
                <span>{new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleRead.mutate({ id: m.id, is_read: !m.is_read })}
                title={m.is_read ? "Marquer non lu" : "Marquer lu"}
              >
                {m.is_read ? <Mail className="h-3 w-3" /> : <MailOpen className="h-3 w-3" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => deleteMutation.mutate(m.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminMessages;

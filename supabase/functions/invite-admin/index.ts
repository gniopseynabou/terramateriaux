import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://terramateriaux.netlify.app",
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Créer un client avec la clé service_role (accès total) ──────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 2. Vérifier que l'appelant est bien connecté et admin ──────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé : token manquant." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer l'utilisateur depuis le JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user: caller }, error: userErr } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "Token invalide." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier le rôle admin de l'appelant
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès refusé : vous n'êtes pas administrateur." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Lire le body de la requête ──────────────────────────────────────────
    const { email, full_name } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "L'adresse e-mail est requise." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://terramateriaux.netlify.app";

    // ── 4. Envoyer l'invitation via l'API Admin Supabase ──────────────────────
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: { full_name: full_name?.trim() ?? "" },
        redirectTo: `${siteUrl}/reset-password`,
      }
    );

    if (inviteError) {
      // L'utilisateur existe déjà → on peut quand même lui attribuer le rôle
      if (!inviteError.message.includes("already been registered")) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 5. Attribuer le rôle admin à l'utilisateur invité ─────────────────────
    // Récupérer l'ID de l'utilisateur invité (peut exister déjà)
    const invitedUserId = inviteData?.user?.id;

    if (invitedUserId) {
      // Insérer ou ignorer si déjà admin
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: invitedUserId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
    } else {
      // L'utilisateur existait déjà → trouver son ID via la RPC optimisée
      const { data: existingUserId } = await supabaseAdmin.rpc("get_user_id_by_email", { email_addr: email.trim().toLowerCase() });
      if (existingUserId) {
        await supabaseAdmin.from("user_roles").upsert(
          { user_id: existingUserId, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Invitation envoyée à ${email}.` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("invite-admin error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur interne." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

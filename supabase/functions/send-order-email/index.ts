import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Terra Matériaux International <fickou.reseau03@gmail.com>";
const BRAND_COLOR = "#C8952A";
const BRAND_DARK = "#1A1A2E";

// ─── STATUS CONFIGURATION ────────────────────────────────────────────────────
const statusConfig: Record<string, { subject: string; emoji: string; title: string; message: string; badge: string }> = {
  "en_attente_paiement": {
    subject: "Votre commande est en attente de paiement",
    emoji: "⏳",
    title: "Commande en attente de paiement",
    badge: "#F59E0B",
    message: `Nous avons bien reçu votre commande. Veuillez procéder au paiement pour que nous puissions la traiter. Une fois votre paiement effectué, notre équipe le vérifiera dans les plus brefs délais.`,
  },
  "paiement_en_verification": {
    subject: "Votre paiement est en cours de vérification",
    emoji: "🔍",
    title: "Paiement en attente de vérification",
    badge: "#3B82F6",
    message: `Nous avons bien reçu votre justificatif de paiement. Notre équipe est en train de le vérifier. Vous serez notifié dès que votre paiement sera confirmé. Merci de votre patience !`,
  },
  "paiement_verifie": {
    subject: "✅ Votre paiement a été confirmé !",
    emoji: "✅",
    title: "Paiement vérifié et confirmé",
    badge: "#10B981",
    message: `Excellent ! Votre paiement a été vérifié avec succès. Votre commande va maintenant être préparée par notre équipe. Nous vous tiendrons informé de l'avancement.`,
  },
  "en_preparation": {
    subject: "🛠️ Votre commande est en cours de préparation",
    emoji: "🛠️",
    title: "Commande en cours de préparation",
    badge: "#8B5CF6",
    message: `Bonne nouvelle ! Notre équipe est en train de préparer votre commande avec soin. Nous nous assurons que tous vos produits sont conformes à votre demande avant l'expédition.`,
  },
  "expediee": {
    subject: "🚚 Votre commande est en route !",
    emoji: "🚚",
    title: "Commande expédiée",
    badge: "#6366F1",
    message: `Votre commande a été remise à notre équipe de livraison et est en route vers vous ! Notre livreur prendra contact avec vous pour coordonner la livraison. Préparez-vous à recevoir vos produits !`,
  },
  "livree": {
    subject: "🎉 Votre commande a été livrée !",
    emoji: "🎉",
    title: "Commande livrée avec succès",
    badge: "#10B981",
    message: `Nous espérons que vous avez bien reçu votre commande et que vous êtes satisfait de vos produits. Merci pour votre confiance en Terra Matériaux International. N'hésitez pas à nous contacter si vous avez la moindre question.`,
  },
};

// ─── EMAIL HTML TEMPLATE ──────────────────────────────────────────────────────
function buildEmailHtml(
  config: typeof statusConfig[string],
  order: { order_number: string; customer_name: string; total: number; items?: string[] }
): string {
  const itemsHtml = order.items && order.items.length > 0
    ? `
    <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:600;color:${BRAND_DARK};font-size:14px;">Récapitulatif de votre commande :</p>
      ${order.items.map(item => `<p style="margin:4px 0;color:#555;font-size:14px;">• ${item}</p>`).join("")}
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_DARK} 0%,#2D2D44 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;color:${BRAND_COLOR};font-size:24px;font-weight:800;letter-spacing:1px;">T.M.I</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Terra Matériaux International</p>
            </td>
          </tr>

          <!-- STATUS BADGE -->
          <tr>
            <td align="center" style="padding:28px 40px 0;">
              <span style="display:inline-block;background:${config.badge};color:#fff;border-radius:50px;padding:8px 24px;font-size:14px;font-weight:600;">
                ${config.emoji} ${config.title}
              </span>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:24px 40px;">
              <p style="margin:0 0 16px;color:${BRAND_DARK};font-size:20px;font-weight:700;">Bonjour ${order.customer_name},</p>
              <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.7;">${config.message}</p>
              
              <!-- ORDER INFO -->
              <div style="border:1px solid #e8e8e8;border-radius:8px;padding:20px;margin:20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#888;font-size:13px;padding-bottom:8px;">Numéro de commande</td>
                    <td align="right" style="color:${BRAND_DARK};font-weight:700;font-size:15px;padding-bottom:8px;">#${order.order_number}</td>
                  </tr>
                  <tr>
                    <td style="color:#888;font-size:13px;border-top:1px solid #f0f0f0;padding-top:8px;">Montant total</td>
                    <td align="right" style="color:${BRAND_COLOR};font-weight:700;font-size:16px;border-top:1px solid #f0f0f0;padding-top:8px;">${order.total.toLocaleString("fr-FR")} FCFA</td>
                  </tr>
                </table>
              </div>

              ${itemsHtml}

              <p style="margin:20px 0 0;color:#888;font-size:13px;line-height:1.6;">
                Pour toute question, contactez-nous à <a href="mailto:contact@terra-materiaux.sn" style="color:${BRAND_COLOR};text-decoration:none;">contact@terra-materiaux.sn</a> ou par téléphone.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">© 2025 Terra Matériaux International — Sénégal</p>
              <p style="margin:4px 0 0;color:#aaa;font-size:11px;">Gros & Détail — BTP, Agriculture, Électricité, Textile</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Secure the webhook
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set.");

    const body = await req.json();
    const { record, old_record } = body;

    // Only send email if the status actually changed
    if (!record || !old_record || record.status === old_record.status) {
      return new Response(JSON.stringify({ message: "No status change, skipping." }), { status: 200 });
    }

    const config = statusConfig[record.status];
    if (!config) {
      return new Response(JSON.stringify({ message: `Unknown status: ${record.status}` }), { status: 200 });
    }

    // Get customer email from the profiles or orders table
    // The customer_email should be stored in the orders table or fetched from auth.users
    const customerEmail = record.customer_email;
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "No customer email found." }), { status: 400 });
    }

    const html = buildEmailHtml(config, {
      order_number: record.order_number,
      customer_name: record.customer_name,
      total: record.total,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customerEmail],
        subject: config.subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

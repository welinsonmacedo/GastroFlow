import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const { data: blockedIp, error } = await supabase
    .from("blocked_ips")
    .select("ip")
    .eq("ip", ip)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (blockedIp) {
    return new Response(JSON.stringify({ blocked: true }), { status: 403 });
  }

  return new Response(JSON.stringify({ blocked: false }), { status: 200 });
});

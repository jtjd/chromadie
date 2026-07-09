import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // The Supabase Webhook sends the new row data in the 'record' property
    const { record } = await req.json();

    // We only care about Mythic rolls
    if (record.rarity !== 'Mythic') {
      return new Response(JSON.stringify({ success: true, message: "Not Mythic, ignoring" }), { status: 200 });
    }

    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL is not set.");
      return new Response(JSON.stringify({ error: "Webhook URL not set" }), { status: 500 });
    }

    // We need to fetch the username since the scores table doesn't store it
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
                                  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', record.user_id)
    .single();

    if (profileError) throw profileError;

    const username = profile?.username || 'A mysterious player';

    // Construct the Discord message payload
    const payload = {
      content: `🎉 **Mythic Roll!** **${username}** just rolled \`${record.hex_code}\` for **${record.score.toLocaleString()}** EP!`,
      // Optional: You could add embeds here for richer formatting later
    };

    // Send the POST request to Discord
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!discordRes.ok) {
      throw new Error(`Discord API error: ${discordRes.status}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

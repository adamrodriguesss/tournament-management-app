import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hjwvtydqqjexmzcpasfr.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_18kaO-QTKNEmWMCip1x0mA_diglDNGF'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from("participants")
    .select("*, users(full_name, email)")
    .eq("status", "pending")
    .limit(1)

  console.log("Data:", data)
  console.log("Error:", error)
}
test()

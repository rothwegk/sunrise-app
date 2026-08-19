import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ethknhjrhdpcjstkquby.supabase.co'
const supabaseKey = 'sb_publishable_umi_M2Hc_ovu-ZeL8iOv0w_fqygDyQF'

export const supabase = createClient(supabaseUrl, supabaseKey)
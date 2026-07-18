// Supabase接続設定。空のままだとデモモード（ブラウザ内保存）で動く。
// SUPABASE_ANON_KEY は publishable key（RLS前提でクライアント公開が前提の公開キー）。
// ※ secret / service_role キーは絶対にここへ書かない。
window.PORTAL_CONFIG = {
  SUPABASE_URL: "https://rdlhhnbwjomlejszmkbv.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_cvxikKeodmwyBZI9X5kLNQ_KU87pMHq",
};

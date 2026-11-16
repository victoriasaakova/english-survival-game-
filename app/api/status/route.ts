export async function GET() {
  return Response.json({
    ai: !!process.env.OPENAI_API_KEY,
    cloud: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  });
}

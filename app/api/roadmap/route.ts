import { NextRequest, NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/adapters/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roadmapData = await generateRoadmap(message);

    const { data, error: dbError } = await supabase
      .from("roadmaps")
      .insert([
        {
          user_id: user.id,   
          raw_input: message,
          data: roadmapData,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
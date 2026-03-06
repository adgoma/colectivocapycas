import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

type DownloadRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: DownloadRouteContext) {
  const routeParams = await context.params;

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return new NextResponse("Configuracion incompleta de Supabase.", { status: 500 });
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("bucket_name, file_path, status")
    .eq("slug", routeParams.slug)
    .eq("status", "published")
    .maybeSingle();

  if (docError || !doc) {
    return new NextResponse("Documento no encontrado.", { status: 404 });
  }

  const { data: signedData, error: signedError } = await supabase
    .storage
    .from(doc.bucket_name)
    .createSignedUrl(doc.file_path, 90);

  if (signedError || !signedData?.signedUrl) {
    return new NextResponse("No se pudo preparar la descarga.", { status: 404 });
  }

  const response = NextResponse.redirect(signedData.signedUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
}


// Ambient module declarations for Deno-style JSR imports used in edge functions.
// This allows Next.js/tsc to type-check without resolving JSR protocols.

declare module "jsr:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
  // No runtime exports needed; just mark module as existing for type checking.
}

// Provide minimal Deno env typing for edge function stubs during tsc.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  exit(code?: number): never;
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};


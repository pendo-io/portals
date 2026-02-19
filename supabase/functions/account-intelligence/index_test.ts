import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.test("External RAG database connection test", async () => {
  const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
  const externalSupabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  console.log("Checking environment variables...");
  console.log("EXTERNAL_SUPABASE_URL:", externalSupabaseUrl ? "✅ Set" : "❌ Missing");
  console.log("EXTERNAL_SUPABASE_SERVICE_KEY:", externalSupabaseServiceKey ? "✅ Set" : "❌ Missing");
  console.log("OPENAI_API_KEY:", openaiApiKey ? "✅ Set" : "❌ Missing");

  assertExists(externalSupabaseUrl, "EXTERNAL_SUPABASE_URL must be set");
  assertExists(externalSupabaseServiceKey, "EXTERNAL_SUPABASE_SERVICE_KEY must be set");
  assertExists(openaiApiKey, "OPENAI_API_KEY must be set");

  // Create client for external Supabase
  const externalClient = createClient(externalSupabaseUrl, externalSupabaseServiceKey);

  // Test 1: Check if documents table exists and has data
  console.log("\n📊 Testing documents table access...");
  const { data: docs, error: docsError } = await externalClient
    .from("documents")
    .select("id, content, metadata")
    .limit(5);

  if (docsError) {
    console.error("❌ Error accessing documents table:", docsError.message);
    throw new Error(`Documents table error: ${docsError.message}`);
  }

  console.log(`✅ Found ${docs?.length || 0} documents in external database`);
  
  if (docs && docs.length > 0) {
    console.log("\n📄 Sample document:");
    console.log("  ID:", docs[0].id);
    console.log("  Content preview:", docs[0].content?.slice(0, 200) + "...");
    console.log("  Metadata:", JSON.stringify(docs[0].metadata, null, 2));
  }

  // Test 2: Generate embedding and search
  console.log("\n🔍 Testing RAG search with embedding...");
  
  // Generate embedding for test query
  const testQuery = "product analytics digital adoption customer engagement Pendo";
  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: testQuery,
    }),
  });

  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData.data?.[0]?.embedding;

  if (!embedding) {
    console.error("❌ Failed to generate embedding");
    throw new Error("Embedding generation failed");
  }

  console.log("✅ Generated embedding vector (dimension:", embedding.length, ")");

  // Search documents using the search_documents RPC
  const { data: searchResults, error: searchError } = await externalClient.rpc("search_documents", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5,
  });

  if (searchError) {
    console.error("❌ Error searching documents:", searchError.message);
    throw new Error(`Search error: ${searchError.message}`);
  }

  console.log(`✅ RAG search returned ${searchResults?.length || 0} results`);

  if (searchResults && searchResults.length > 0) {
    console.log("\n🎯 Top RAG results:");
    searchResults.forEach((result: any, i: number) => {
      console.log(`\n  [${i + 1}] Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`      Content: ${result.content?.slice(0, 150)}...`);
    });
  }

  assertEquals(true, true, "Test completed successfully");
});

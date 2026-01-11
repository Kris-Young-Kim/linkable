import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

/**
 * n8n 등 외부 크롤러로부터 상품 데이터를 수집하는 Webhook 엔드포인트
 * 
 * 데이터 형식:
 * {
 *   "source_code": "ablelife",
 *   "external_id": "12345",
 *   "product_url": "https://...",
 *   "title": "보조기기 상품명",
 *   "price": 50000,
 *   "image_url": "https://...",
 *   "brand": "제조사",
 *   "iso_code": "15 09"
 * }
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const secret = process.env.N8N_WEBHOOK_SECRET || "linkable-crawl-secret-2025";

    if (authHeader !== `Bearer ${secret}`) {
        console.warn("[Crawler Webhook] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const products = Array.isArray(body) ? body : [body];
        const supabase = getSupabaseServerClient();

        const results = {
            total: products.length,
            success: 0,
            failed: 0,
            errors: [] as any[],
        };

        for (const p of products) {
            try {
                // 1. 소스 ID 조회 (ablelife, carelifemall 등)
                const { data: source } = await supabase
                    .from("crawl_sources")
                    .select("id")
                    .eq("source_code", p.source_code)
                    .maybeSingle();

                if (!source) {
                    throw new Error(`등록되지 않은 소스 코드입니다: ${p.source_code}`);
                }

                // 2. product_listings에 upsert (원천 데이터 보관)
                const externalId = p.external_id || p.product_url;
                const { data: listing, error: upsertError } = await supabase
                    .from("product_listings")
                    .upsert({
                        source_id: source.id,
                        external_id: externalId,
                        product_url: p.product_url,
                        title: p.title,
                        brand: p.brand || null,
                        current_price: p.price || null,
                        image_urls: p.image_url ? [p.image_url] : [],
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'source_id, external_id'
                    })
                    .select()
                    .single();

                if (upsertError) throw upsertError;

                // 3. 가격 스냅샷 저장 (가격 변동 추적용)
                if (p.price && listing) {
                    await supabase.from("listing_price_snapshots").insert({
                        listing_id: listing.id,
                        price: p.price,
                        captured_at: new Date().toISOString(),
                    });
                }

                // 4. 서비스 데이터(products) 동기화
                // TODO: 향후 별도의 매핑 엔진(Mappping Engine)으로 분리 고려
                
                // ISO 코드 처리: 없으면 자동 추론
                let isoCode = p.iso_code || null;
                
                // ISO 코드가 없으면 자동 추론 (KS_P_ISO_9999_2022.md 기반)
                if (!isoCode || isoCode === "N999999" || isoCode === "00 00") {
                    try {
                        const { inferIsoCodeFromProduct } = await import("@/core/matching/ai-iso-inference");
                        const aiResult = await inferIsoCodeFromProduct({
                            name: p.title,
                            description: p.description || "",
                        });
                        
                        if (aiResult && aiResult.confidence >= 0.5) {
                            isoCode = aiResult.isoCode;
                            console.log(`[Crawler Webhook] Auto-inferred ISO code for "${p.title}": ${isoCode} (confidence: ${aiResult.confidence})`);
                        } else {
                            // AI 추론 실패 시 키워드 기반 추론 시도
                            const { searchIsoCodesAsync } = await import("@/lib/iso-9999-catalog-async");
                            const searchResults = await searchIsoCodesAsync(p.title, supabase);
                            if (searchResults.length > 0) {
                                isoCode = searchResults[0].iso;
                                console.log(`[Crawler Webhook] Keyword-matched ISO code for "${p.title}": ${isoCode}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`[Crawler Webhook] ISO inference failed for "${p.title}":`, error);
                    }
                }
                
                // ISO 코드를 Division 레벨로 변환 (KS_P_ISO_9999_2022.md 기준)
                if (isoCode && isoCode !== "N999999" && isoCode !== "00 00") {
                    const { convertToDivisionLevel } = await import("@/lib/utils/iso-code-converter");
                    const convertedCode = await convertToDivisionLevel(isoCode, supabase);
                    if (convertedCode) {
                        isoCode = convertedCode;
                        console.log(`[Crawler Webhook] Converted to Division level: ${isoCode}`);
                    }
                } else {
                    // 추론 실패 시 기본값
                    isoCode = "N999999";
                }
                
                // ISO 코드 문자열을 iso_code_id로 변환
                const { getIsoCodeId } = await import("@/lib/utils/iso-code-converter");
                const isoCodeId = await getIsoCodeId(isoCode, supabase);
                
                // ⚠️ iso_code_id가 null이면 제품 저장하지 않음 (ISO 코드가 없는 제품은 추천 불가)
                if (!isoCodeId) {
                    console.warn(`[Crawler Webhook] Skipping product "${p.title}": iso_code_id is null (ISO: ${isoCode})`);
                    results.failed++;
                    results.errors.push({ 
                        title: p.title || 'Unknown', 
                        error: `ISO code "${isoCode}" could not be mapped to iso_code_id. Product requires a valid ISO code.` 
                    });
                    continue; // 다음 제품으로
                }
                
                const { error: productError } = await supabase
                    .from("products")
                    .upsert({
                        name: p.title,
                        iso_code_id: isoCodeId,  // ✅ iso_code_id 사용 (null이 아님 보장)
                        price: p.price || null,
                        purchase_link: p.product_url,
                        image_url: p.image_url || null,
                        manufacturer: p.brand || null,
                        category: p.source_code,
                        is_active: true,
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'name, iso_code_id'  // ✅ iso_code_id로 변경
                    });

                if (productError) throw productError;

                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push({ title: p.title || 'Unknown', error: err.message });
            }
        }

        logEvent({
            category: "crawler",
            action: "webhook_received",
            payload: { ...results, source: products[0]?.source_code },
        });

        return NextResponse.json(results);
    } catch (err: any) {
        console.error("[Crawler Webhook Error]:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

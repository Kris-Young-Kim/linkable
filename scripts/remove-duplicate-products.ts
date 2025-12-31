#!/usr/bin/env tsx
/**
 * 중복 상품 데이터 삭제 스크립트
 * 
 * 사용법:
 *   pnpm tsx scripts/remove-duplicate-products.ts
 * 
 * 이 스크립트는 같은 purchase_link를 가진 상품 중 가장 최신 것만 남기고 나머지를 삭제합니다.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "설정됨" : "설정되지 않음");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "설정됨" : "설정되지 않음");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function removeDuplicateProducts() {
  console.log("🔄 중복 상품 데이터 삭제 시작...\n");

  try {
    // 1. 중복 데이터 확인
    console.log("📊 중복 데이터 확인 중...");
    const { data: allProducts, error: queryError } = await supabase
      .from("products")
      .select("id, name, purchase_link, created_at")
      .order("created_at", { ascending: false });

    if (queryError) {
      throw queryError;
    }

    if (!allProducts || allProducts.length === 0) {
      console.log("   상품 데이터가 없습니다.");
      return;
    }

    console.log(`   전체 상품 수: ${allProducts.length}개`);

    // purchase_link 기준으로 중복 그룹화
    const groupedByLink = new Map<string, Array<{ id: string; name: string; created_at: string | null }>>();
    allProducts.forEach((product) => {
      if (!product.purchase_link || product.purchase_link.trim() === "") return;
      
      if (!groupedByLink.has(product.purchase_link)) {
        groupedByLink.set(product.purchase_link, []);
      }
      groupedByLink.get(product.purchase_link)!.push({
        id: product.id,
        name: product.name,
        created_at: product.created_at,
      });
    });

    const duplicateGroups = Array.from(groupedByLink.entries())
      .filter(([_, products]) => products.length > 1)
      .map(([link, products]) => ({
        purchase_link: link,
        count: products.length,
        products: products.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; // 최신 것이 먼저
        }),
      }));

    console.log(`   발견된 중복 그룹: ${duplicateGroups.length}개`);
    if (duplicateGroups.length > 0) {
      duplicateGroups.slice(0, 10).forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.purchase_link.substring(0, 60)}... : ${group.count}개`);
      });
      if (duplicateGroups.length > 10) {
        console.log(`   ... 외 ${duplicateGroups.length - 10}개 그룹`);
      }
    }

    // 2. 중복 삭제
    console.log("\n🗑️  중복 데이터 삭제 중...");
    let totalDeleted = 0;
    const idsToDelete: string[] = [];

    for (const group of duplicateGroups) {
      // 첫 번째(가장 최신)를 제외한 나머지 삭제 대상에 추가
      const toDelete = group.products.slice(1);
      idsToDelete.push(...toDelete.map((p) => p.id));
    }

    console.log(`   삭제 대상: ${idsToDelete.length}개`);

    // 배치로 삭제 (한 번에 너무 많이 삭제하지 않도록)
    const batchSize = 50;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.error(`   ❌ 배치 삭제 실패 (${i + 1}-${Math.min(i + batchSize, idsToDelete.length)}):`, deleteError.message);
      } else {
        totalDeleted += batch.length;
        console.log(`   ✅ 삭제 진행: ${totalDeleted}/${idsToDelete.length}개`);
      }
    }

    console.log(`   ✅ 삭제 완료: ${totalDeleted}개 상품 삭제됨`);

    // 3. name + purchase_link 조합 중복도 처리
    console.log("\n🔍 name + purchase_link 조합 중복 확인 중...");
    const { data: remainingProducts, error: remainingError } = await supabase
      .from("products")
      .select("id, name, purchase_link, created_at")
      .not("name", "is", null)
      .order("created_at", { ascending: false });

    if (remainingError) {
      throw remainingError;
    }

    const groupedByNameAndLink = new Map<string, Array<{ id: string; created_at: string | null }>>();
    remainingProducts?.forEach((product) => {
      const key = `${product.name}|${product.purchase_link || "NULL"}`;
      if (!groupedByNameAndLink.has(key)) {
        groupedByNameAndLink.set(key, []);
      }
      groupedByNameAndLink.get(key)!.push({
        id: product.id,
        created_at: product.created_at,
      });
    });

    const nameDuplicateGroups = Array.from(groupedByNameAndLink.entries())
      .filter(([_, products]) => products.length > 1)
      .map(([key, products]) => ({
        key,
        count: products.length,
        products: products.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        }),
      }));

    console.log(`   발견된 중복 그룹: ${nameDuplicateGroups.length}개`);

    const nameIdsToDelete: string[] = [];
    for (const group of nameDuplicateGroups) {
      // 첫 번째(가장 최신)를 제외한 나머지 삭제 대상에 추가
      const toDelete = group.products.slice(1);
      nameIdsToDelete.push(...toDelete.map((p) => p.id));
    }

    let nameDeleted = 0;
    if (nameIdsToDelete.length > 0) {
      console.log(`   삭제 대상: ${nameIdsToDelete.length}개`);
      
      for (let i = 0; i < nameIdsToDelete.length; i += batchSize) {
        const batch = nameIdsToDelete.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .in("id", batch);

        if (deleteError) {
          console.error(`   ❌ 배치 삭제 실패:`, deleteError.message);
        } else {
          nameDeleted += batch.length;
          console.log(`   ✅ 삭제 진행: ${nameDeleted}/${nameIdsToDelete.length}개`);
        }
      }
    }

    console.log(`   ✅ 삭제 완료: ${nameDeleted}개 상품 삭제됨`);

    // 4. 결과 확인
    console.log("\n📊 최종 결과 확인 중...");
    const { data: finalProducts, error: finalError, count: finalCount } = await supabase
      .from("products")
      .select("purchase_link", { count: "exact" });

    if (finalError) {
      throw finalError;
    }

    const uniqueLinks = new Set(
      finalProducts?.filter((p) => p.purchase_link && p.purchase_link.trim() !== "").map((p) => p.purchase_link) || []
    );

    console.log(`   총 상품 수: ${finalCount || 0}개`);
    console.log(`   고유한 purchase_link 수: ${uniqueLinks.size}개`);
    console.log(`   총 삭제된 상품 수: ${totalDeleted + nameDeleted}개`);

    console.log("\n✅ 중복 데이터 삭제 완료!");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    if (error instanceof Error) {
      console.error("   메시지:", error.message);
      console.error("   스택:", error.stack);
    }
    process.exit(1);
  }
}

// 실행
removeDuplicateProducts();

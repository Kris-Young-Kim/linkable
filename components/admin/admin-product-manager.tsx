"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  X,
  Upload,
  Download,
  Sparkles,
  Loader2,
  FileText,
  Globe,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IsoCodeSelector } from "./iso-code-selector";

type AdminProduct = {
  id: string;
  name: string;
  iso_code: string;
  description: string | null;
  price: number | null;
  purchase_link: string | null;
  image_url: string | null;
  manufacturer: string | null;
  category: string | null;
  is_active: boolean;
  updated_at: string | null;
};

type AdminProductManagerProps = {
  initialProducts: AdminProduct[];
};

type SortOption =
  | "updated-desc"
  | "updated-asc"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc";

export function AdminProductManager({
  initialProducts,
}: AdminProductManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 제품 목록 새로고침 함수
  const fetchProducts = useCallback(async () => {
    try {
      console.log("[Admin Products] Fetching products from API...");
      const response = await fetch("/api/admin/products");

      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText;
        const contentType = response.headers.get("content-type");

        let errorData: any = {};
        let responseText = "";
        let errorMessage = `상품 목록을 불러오지 못했습니다 (${status})`;

        try {
          // 응답 본문을 텍스트로 읽기
          responseText = await response.text();

          // JSON 파싱 시도
          if (
            contentType &&
            contentType.includes("application/json") &&
            responseText
          ) {
            try {
              errorData = JSON.parse(responseText);
            } catch (jsonError) {
              console.warn(
                "[Admin Products] Failed to parse error response as JSON:",
                jsonError
              );
              errorData = { message: responseText || statusText };
            }
          } else if (responseText) {
            errorData = { message: responseText };
          } else {
            errorData = { message: statusText };
          }
        } catch (readError) {
          console.error(
            "[Admin Products] Failed to read error response:",
            readError
          );
          errorData = { message: `HTTP ${status}: ${statusText}` };
        }

        // 상태 코드별 에러 메시지 설정
        if (status === 401) {
          errorMessage = "인증이 필요합니다. 로그인해주세요.";
        } else if (status === 403) {
          errorMessage =
            errorData.error ||
            errorData.message ||
            "관리자 권한이 필요합니다. Clerk에서 사용자 역할(role)을 'admin' 또는 'expert'로 설정해주세요.";
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        // 에러 로깅 (개발 환경에서만 상세 로그)
        if (process.env.NODE_ENV === "development") {
          console.error("[Admin Products] API error:", {
            status,
            statusText,
            contentType,
            responseText: responseText || "(empty)",
            parsedErrorData:
              Object.keys(errorData).length > 0 ? errorData : "(empty)",
            finalMessage: errorMessage,
          });
        } else {
          console.error(
            `[Admin Products] API error (${status}): ${errorMessage}`
          );
        }

        setErrorMessage(errorMessage);
        return;
      }

      const data = await response.json();
      console.log(
        `[Admin Products] Received ${data.products?.length ?? 0} products`
      );
      setProducts(data.products || []);

      if (!data.products || data.products.length === 0) {
        console.warn("[Admin Products] No products found in database");
      }
    } catch (error) {
      console.error("[Admin Products] 제품 목록 새로고침 실패:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "네트워크 오류가 발생했습니다.";
      setErrorMessage(`네트워크 오류: ${errorMsg}`);
    }
  }, []);

  // 일괄 선택/삭제
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    iso_code: "",
    price: "",
    purchase_link: "",
    description: "",
    image_url: "",
    manufacturer: "",
    category: "",
  });

  // ISO 코드 자동 추천
  const [isoSuggestions, setIsoSuggestions] = useState<
    Array<{ iso: string; label: string; description: string }>
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // 일괄 업로드
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    created: number;
    updated: number;
    failed: number;
    total: number;
  } | null>(null);

  // 크롤링 (단순화)
  const [crawlValues, setCrawlValues] = useState({
    url: "", // 웹사이트 URL
    max: "30", // 기본값
  });
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<string | null>(null);
  const [crawlPreview, setCrawlPreview] = useState<
    Array<{
      id: string;
      name: string;
      price: number | null;
      purchase_link: string | null;
      image_url: string | null;
      iso_code: string | null;
      inferredIsoCode?: string | null; // 추론된 ISO 코드
      description?: string | null;
      manufacturer?: string | null;
      category?: string | null;
    }>
  >([]);
  const [isInferringIso, setIsInferringIso] = useState(false);
  const [selectedPreviewProducts, setSelectedPreviewProducts] = useState<
    Set<string>
  >(new Set());
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const crawlAbortRef = useRef<AbortController | null>(null);

  // 필터링 및 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIsoCode, setSelectedIsoCode] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 크롤링 로그 추가 함수 (먼저 정의)
  const addCrawlLog = useCallback((message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString("ko-KR");
    setCrawlLogs((prev) => [
      ...prev,
      `[${timestamp}] ${isError ? "❌" : "✓"} ${message}`,
    ]);
  }, []);

  // 크롤링된 상품들의 ISO 코드 일괄 추론
  const inferIsoCodesForCrawledProducts = useCallback(
    async (products: typeof crawlPreview) => {
      setIsInferringIso(true);
      addCrawlLog(`ISO 코드 추론 시작 (${products.length}개 상품)...`);

      try {
        const updatedProducts = await Promise.all(
          products.map(async (product) => {
            if (!product.name || product.name.length < 2) {
              return { ...product, inferredIsoCode: null };
            }

            try {
              const response = await fetch("/api/admin/iso-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: product.name }),
              });

              if (response.ok) {
                const data = await response.json();
                const topSuggestion = data.suggestions?.[0];
                const inferredIso = topSuggestion?.iso || null;

                if (inferredIso) {
                  console.log(
                    `[ISO Inference] ${product.name} -> ${inferredIso}`
                  );
                }

                return {
                  ...product,
                  inferredIsoCode: inferredIso,
                  iso_code: inferredIso || product.iso_code || null,
                };
              }
            } catch (error) {
              console.error(
                `[ISO Inference] Error for ${product.name}:`,
                error
              );
            }

            return { ...product, inferredIsoCode: null };
          })
        );

        setCrawlPreview(updatedProducts);
        const inferredCount = updatedProducts.filter(
          (p) => p.inferredIsoCode
        ).length;
        addCrawlLog(
          `ISO 코드 추론 완료: ${inferredCount}/${products.length}개 상품에 ISO 코드 추론됨`
        );
      } catch (error) {
        console.error("[ISO Inference] Batch inference error:", error);
        addCrawlLog("ISO 코드 추론 중 오류 발생", true);
      } finally {
        setIsInferringIso(false);
      }
    },
    [addCrawlLog]
  );

  // ISO 코드 자동 추천 (상품명 입력 시)
  const fetchIsoSuggestions = useCallback(
    async (productName: string) => {
      if (!productName || productName.length < 2) {
        setIsoSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const response = await fetch("/api/admin/iso-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productName }),
        });

        if (response.ok) {
          const data = await response.json();
          const suggestions = data.suggestions || [];
          setIsoSuggestions(suggestions);

          // 로그 출력 (디버깅용)
          if (suggestions.length > 0) {
            console.log("[ISO Suggest] 추천 결과:", suggestions);
          } else {
            console.log("[ISO Suggest] 추천 결과 없음");
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("[ISO Suggest] API 오류:", response.status, errorData);
        }
      } catch (error) {
        console.error("[Admin Products] ISO suggestion error:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [formValues.iso_code]
  );

  // 상품명 변경 시 ISO 코드 추천
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formValues.name) {
        fetchIsoSuggestions(formValues.name);
      } else {
        setIsoSuggestions([]);
      }
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timer);
  }, [formValues.name, fetchIsoSuggestions]);

  // 일괄 업로드 핸들러
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setErrorMessage("파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        body: formData,
      }).catch((error) => {
        console.error("[Admin Products] Fetch error:", error);
        throw new Error(`네트워크 오류: ${error.message}`);
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          errorPayload?.error ?? `파일 업로드 실패 (${response.status})`
        );
      }

      const result = await response.json();
      setUploadResult(result);
      setUploadFile(null);

      // 상품 목록 새로고침
      const productsResponse = await fetch("/api/admin/products");
      if (productsResponse.ok) {
        const data = await productsResponse.json();
        setProducts(data.products || []);
      }

      setSuccessMessage(
        `일괄 등록 완료: 생성 ${result.created}개, 업데이트 ${result.updated}개, 실패 ${result.failed}개`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error("[Admin Products] Upload error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "파일 업로드 실패"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const normalizeUrlInput = (value: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    // 프로토콜 없으면 https 기본 적용
    return `https://${trimmed}`;
  };

  // 크롤링 실행 핸들러 (fetch + cheerio 기반)
  const handleCrawl = async () => {
    if (!crawlValues.url) {
      setErrorMessage("웹사이트 URL을 입력해주세요.");
      return;
    }

    setIsCrawling(true);
    setErrorMessage(null);
    setCrawlResult(null);
    setCrawlPreview([]);
    setSelectedPreviewProducts(new Set());
    setCrawlLogs([]);
    addCrawlLog("HTML 크롤링 시작...");

    try {
      const normalizedUrl = normalizeUrlInput(crawlValues.url);

      // 중단용 AbortController 준비
      const controller = new AbortController();
      crawlAbortRef.current = controller;

      // max 값 검증 및 변환
      const maxValue = crawlValues.max
        ? Math.max(1, Math.min(200, parseInt(crawlValues.max) || 30))
        : 30;

      console.log(
        `[Admin Products] 크롤링 요청: URL=${normalizedUrl}, max=${maxValue}`
      );

      const response = await fetch("/api/admin/products/crawl-playwright", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizedUrl,
          max: maxValue,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error ?? "크롤링 실패");
      }

      const result = await response.json();

      console.log(
        `[Admin Products] 크롤링 응답: ${
          result.products?.length || 0
        }개 제품 발견 (요청한 max: ${maxValue})`
      );

      if (result.products && result.products.length > 0) {
        addCrawlLog(
          `${result.products.length}개 제품 발견 (요청: ${maxValue}개)`
        );

        // 크롤링된 상품들을 미리보기에 설정 (iso_code는 null로 초기화)
        const productsWithNullIso = result.products.map((p: any) => ({
          ...p,
          iso_code: null,
          inferredIsoCode: null,
        }));
        setCrawlPreview(productsWithNullIso);

        setCrawlResult(
          `${result.products.length}개 제품을 찾았습니다. ISO 코드를 추론 중...`
        );

        // 모든 상품 자동 선택
        setSelectedPreviewProducts(
          new Set(result.products.map((p: { id: string }) => p.id))
        );

        // ISO 코드 추론 시작
        await inferIsoCodesForCrawledProducts(productsWithNullIso);

        setCrawlResult(
          `${result.products.length}개 제품을 찾았습니다. 아래에서 선택하여 등록하세요. (요청한 최대 개수: ${maxValue}개)`
        );
      } else {
        // 디버깅 정보가 있으면 표시
        if (result.debug) {
          const debugMsg = `제품을 찾을 수 없습니다.\n\n디버깅 정보:\n- HTML 길이: ${
            result.debug.htmlLength
          } bytes\n- 링크 개수: ${result.debug.linkCount}개\n- 테이블 개수: ${
            result.debug.tableCount
          }개\n- 발견된 셀렉터: ${
            result.debug.foundSelector || "없음"
          }\n\n페이지 구조를 확인하거나 다른 URL을 시도해보세요.`;
          setCrawlResult(debugMsg);
          addCrawlLog(
            `디버깅: 링크 ${result.debug.linkCount}개, 테이블 ${result.debug.tableCount}개 발견`,
            true
          );
        } else {
          setCrawlResult(result.message || "제품을 찾을 수 없습니다.");
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        addCrawlLog("사용자에 의해 크롤링이 중단되었습니다.", true);
        setErrorMessage("크롤링이 중단되었습니다.");
      } else {
        console.error("HTML 크롤링 오류:", error);
        const errorMsg = error instanceof Error ? error.message : "크롤링 실패";
        addCrawlLog(`오류: ${errorMsg}`, true);
        setErrorMessage(errorMsg);
      }
    } finally {
      crawlAbortRef.current = null;
      setIsCrawling(false);
    }
  };

  // 크롤링 중단 버튼
  const handleCrawlStop = () => {
    if (crawlAbortRef.current) {
      crawlAbortRef.current.abort();
    }
  };

  // 선택한 상품 등록
  const handleRegisterSelected = async () => {
    if (selectedPreviewProducts.size === 0) {
      setErrorMessage("등록할 상품을 선택해주세요.");
      return;
    }

    setIsRegistering(true);
    setErrorMessage(null);
    addCrawlLog(`${selectedPreviewProducts.size}개 상품 등록 시작...`);

    try {
      const selectedProducts = crawlPreview.filter((p) =>
        selectedPreviewProducts.has(p.id)
      );

      // 추론/수정된 ISO 코드 포함
      const productsToRegister = selectedProducts.map((p) => ({
        name: p.name,
        iso_code: p.iso_code || null, // 추론/수정된 ISO 코드 사용
        price: p.price,
        purchase_link: p.purchase_link,
        image_url: p.image_url,
        manufacturer: p.manufacturer,
        description: p.description,
        category: p.category,
      }));

      // 유효성 검사 (이름만 필수, ISO 코드는 선택 사항)
      const invalidProducts = productsToRegister.filter(
        (p) => !p.name || !p.name.trim()
      );

      if (invalidProducts.length > 0) {
        setErrorMessage(
          `${invalidProducts.length}개 상품의 이름이 유효하지 않습니다.`
        );
        setIsRegistering(false);
        return;
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: productsToRegister,
        }),
      });

      let result: any;

      if (!response.ok) {
        let errorPayload: any = {};
        const contentType = response.headers.get("content-type");

        try {
          const responseText = await response.text();
          if (
            contentType &&
            contentType.includes("application/json") &&
            responseText
          ) {
            try {
              errorPayload = JSON.parse(responseText);
            } catch {
              errorPayload = { message: responseText || response.statusText };
            }
          } else {
            errorPayload = { message: responseText || response.statusText };
          }
        } catch (parseError) {
          console.error(
            "[Admin Products] Failed to parse error response:",
            parseError
          );
          errorPayload = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const errorMessage =
          errorPayload?.error ||
          errorPayload?.message ||
          (response.status === 403
            ? "관리자 권한이 필요합니다. Clerk에서 사용자 역할(role)을 'admin' 또는 'expert'로 설정해주세요."
            : `상품 등록 실패 (${response.status})`);

        throw new Error(errorMessage);
      }

      // 성공 응답 파싱
      result = await response.json();
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      const failed = result.failed ?? 0;
      const total = result.total ?? selectedProducts.length;

      addCrawlLog(
        `등록 완료: 생성 ${created}개, 업데이트 ${updated}개, 실패 ${failed}개 (총 ${total}개 시도)`
      );

      setSuccessMessage(
        `등록 완료: 생성 ${created}개, 업데이트 ${updated}개, 실패 ${failed}개 (총 ${total}개 시도)`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      // 상품 목록 새로고침
      await fetchProducts();

      // 미리보기 초기화
      setCrawlPreview([]);
      setSelectedPreviewProducts(new Set());
      setCrawlResult(null);
      setCrawlValues({ url: "", max: "30" });
    } catch (error) {
      console.error("[Admin Products] Register error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "상품 등록 실패";
      addCrawlLog(`오류: ${errorMsg}`, true);
      setErrorMessage(errorMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      console.log("[Admin Products] Creating product:", formValues.name);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name,
          iso_code: formValues.iso_code,
          description: formValues.description || null,
          purchase_link: formValues.purchase_link || null,
          price: formValues.price ? Number(formValues.price) : null,
          image_url: formValues.image_url || null,
          manufacturer: formValues.manufacturer || null,
          category: formValues.category || null,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error ?? "상품 등록을 실패했습니다.");
      }

      const payload = (await response.json()) as { product: AdminProduct };
      setProducts((prev) => [payload.product, ...prev]);
      setFormValues({
        name: "",
        iso_code: "",
        price: "",
        purchase_link: "",
        description: "",
        image_url: "",
        manufacturer: "",
        category: "",
      });
      setSuccessMessage(
        `"${payload.product.name}" 상품이 성공적으로 등록되었습니다.`
      );
      console.log(
        "[Admin Products] Product created successfully:",
        payload.product.id
      );

      // 성공 메시지 3초 후 자동 제거
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("[Admin Products] Create error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "상품 등록을 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<AdminProduct>) => {
    console.log(`[Admin Products] Updating product ${id}:`, updates);
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload?.error ?? "상품 수정에 실패했습니다.");
    }

    const payload = (await response.json()) as { product: AdminProduct };
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? payload.product : product))
    );
    console.log(`[Admin Products] Product updated successfully: ${id}`);
  };

  // 체크박스 선택 함수들
  const handleSelectAll = (checked: boolean, targetList: AdminProduct[]) => {
    if (checked) {
      const allIds = new Set(targetList.map((p) => p.id));
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // 일괄 삭제 함수
  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      return;
    }

    if (
      !window.confirm(`선택한 ${selectedProducts.size}개 상품을 삭제할까요?`)
    ) {
      return;
    }

    setIsBulkDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deletePromises = Array.from(selectedProducts).map(async (id) => {
        const response = await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`상품 ${id} 삭제 실패`);
        }
        return id;
      });

      await Promise.all(deletePromises);
      setSuccessMessage(`${selectedProducts.size}개 상품이 삭제되었습니다.`);
      setSelectedProducts(new Set());
      await fetchProducts();
    } catch (error) {
      console.error("[Admin Products] 일괄 삭제 오류:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "일괄 삭제에 실패했습니다."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log(`[Admin Products] Deleting product ${id}`);
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload?.error ?? "상품 삭제에 실패했습니다.");
    }

    setProducts((prev) => prev.filter((product) => product.id !== id));
    console.log(`[Admin Products] Product deleted successfully: ${id}`);
  };

  const productCountByIso = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, item) => {
      acc[item.iso_code] = (acc[item.iso_code] ?? 0) + 1;
      return acc;
    }, {});
  }, [products]);

  // 고유한 ISO 코드 목록
  const uniqueIsoCodes = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.iso_code))).sort();
  }, [products]);

  // 고유한 카테고리 목록
  const uniqueCategories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => p.category)
          .filter((cat): cat is string => Boolean(cat))
      )
    ).sort();
  }, [products]);

  // 필터링 및 정렬된 상품 목록
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.iso_code.toLowerCase().includes(query) ||
          product.manufacturer?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
      );
    }

    // ISO 코드 필터
    if (selectedIsoCode === "no-iso") {
      filtered = filtered.filter(
        (product) =>
          !product.iso_code ||
          product.iso_code === "N999999" ||
          product.iso_code.trim() === ""
      );
    } else if (selectedIsoCode !== "all") {
      filtered = filtered.filter(
        (product) => product.iso_code === selectedIsoCode
      );
    }

    // 카테고리 필터
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // 상태 필터
    if (selectedStatus !== "all") {
      const isActive = selectedStatus === "active";
      filtered = filtered.filter((product) => product.is_active === isActive);
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "updated-desc":
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
        case "updated-asc":
          return (
            new Date(a.updated_at || 0).getTime() -
            new Date(b.updated_at || 0).getTime()
          );
        case "name-asc":
          return a.name.localeCompare(b.name, "ko");
        case "name-desc":
          return b.name.localeCompare(a.name, "ko");
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    products,
    searchQuery,
    selectedIsoCode,
    selectedCategory,
    selectedStatus,
    sortBy,
  ]);

  // 필터/검색 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedIsoCode, selectedCategory, selectedStatus, sortBy]);

  // ISO 코드가 없는 상품들에 대해 일괄 ISO 코드 추론
  const handleBatchInferIsoCodes = useCallback(async () => {
    const productsWithoutIso = filteredAndSortedProducts.filter(
      (p) => !p.iso_code || p.iso_code === "N999999" || p.iso_code.trim() === ""
    );

    if (productsWithoutIso.length === 0) {
      setErrorMessage("ISO 코드가 없는 상품이 없습니다.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setIsInferringIso(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const product of productsWithoutIso) {
        try {
          const response = await fetch("/api/admin/iso-suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productName: product.name }),
          });

          if (response.ok) {
            const data = await response.json();
            const topSuggestion = data.suggestions?.[0];
            const inferredIso = topSuggestion?.iso || null;

            if (inferredIso) {
              await handleUpdate(product.id, { iso_code: inferredIso });
              successCount++;
            } else {
              failCount++;
            }
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`[ISO Inference] Error for ${product.name}:`, error);
          failCount++;
        }
      }

      setSuccessMessage(
        `ISO 코드 추론 완료: ${successCount}개 성공, ${failCount}개 실패`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      // 상품 목록 새로고침
      await fetchProducts();
    } catch (error) {
      console.error("[ISO Inference] Batch inference error:", error);
      setErrorMessage("일괄 ISO 코드 추론 중 오류가 발생했습니다.");
    } finally {
      setIsInferringIso(false);
    }
  }, [filteredAndSortedProducts, handleUpdate, fetchProducts]);

  // 선택한 상품들에 대해 ISO 코드 추론
  const handleInferIsoForSelected = useCallback(async () => {
    if (selectedProducts.size === 0) {
      setErrorMessage("ISO 코드를 추론할 상품을 선택해주세요.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const selectedProductsList = products.filter((p) =>
      selectedProducts.has(p.id)
    );

    setIsInferringIso(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const product of selectedProductsList) {
        try {
          const response = await fetch("/api/admin/iso-suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productName: product.name }),
          });

          if (response.ok) {
            const data = await response.json();
            const topSuggestion = data.suggestions?.[0];
            const inferredIso = topSuggestion?.iso || null;

            if (inferredIso) {
              await handleUpdate(product.id, { iso_code: inferredIso });
              successCount++;
            } else {
              failCount++;
            }
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`[ISO Inference] Error for ${product.name}:`, error);
          failCount++;
        }
      }

      setSuccessMessage(
        `ISO 코드 추론 완료: ${successCount}개 성공, ${failCount}개 실패`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      // 상품 목록 새로고침
      await fetchProducts();
      setSelectedProducts(new Set());
    } catch (error) {
      console.error("[ISO Inference] Batch inference error:", error);
      setErrorMessage("일괄 ISO 코드 추론 중 오류가 발생했습니다.");
    } finally {
      setIsInferringIso(false);
    }
  }, [selectedProducts, products, handleUpdate, fetchProducts]);

  // 전체 페이지 수 계산
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedProducts.length / pageSize);
  }, [filteredAndSortedProducts.length, pageSize]);

  // 현재 페이지에 표시할 상품 목록
  const visibleProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedProducts.slice(startIndex, endIndex);
  }, [filteredAndSortedProducts, currentPage, pageSize]);

  return (
    <div className="space-y-8">
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single">단일 등록</TabsTrigger>
          <TabsTrigger value="bulk">일괄 업로드</TabsTrigger>
          <TabsTrigger value="crawl">크롤링</TabsTrigger>
          <TabsTrigger value="list">상품 목록</TabsTrigger>
        </TabsList>

        {/* 단일 상품 등록 */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>새 상품 등록</CardTitle>
              <CardDescription>
                ISO 9999 코드에 해당하는 상품을 빠르게 추가하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={handleCreate}
              >
                <div className="md:col-span-2">
                  <Label htmlFor="product-name" className="mb-2 block">
                    상품 이름
                    {isLoadingSuggestions && (
                      <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                    )}
                  </Label>
                  <Input
                    id="product-name"
                    required
                    placeholder="상품 이름을 입력하세요 (ISO 코드 자동 추천)"
                    value={formValues.name}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                  {isoSuggestions.length > 0 && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-900">
                        <Sparkles className="h-4 w-4" />
                        추천 ISO 코드
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isoSuggestions.map((suggestion) => (
                          <Badge
                            key={suggestion.iso}
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100"
                            onClick={() => {
                              setFormValues((prev) => ({
                                ...prev,
                                iso_code: suggestion.iso,
                              }));
                            }}
                          >
                            ISO {suggestion.iso} - {suggestion.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="iso-code" className="mb-2 block">
                    ISO 코드 <span className="text-red-500">*</span>
                  </Label>
                  <IsoCodeSelector
                    value={formValues.iso_code}
                    onValueChange={(value) =>
                      setFormValues((prev) => ({ ...prev, iso_code: value }))
                    }
                    suggestions={isoSuggestions}
                  />
                </div>
                <Input
                  placeholder="구매 링크"
                  value={formValues.purchase_link}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      purchase_link: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="이미지 URL"
                  value={formValues.image_url}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      image_url: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="제조사"
                  value={formValues.manufacturer}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      manufacturer: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="카테고리 (예: naver, 11st)"
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                />
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="설명"
                    value={formValues.description}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "등록 중..." : "상품 등록"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 일괄 업로드 */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>일괄 업로드</CardTitle>
              <CardDescription>
                CSV, JSON 또는 PDF 카탈로그 파일로 여러 상품을 한 번에
                등록하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              {uploadResult && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                  <div className="text-sm font-medium text-blue-900">
                    업로드 결과
                  </div>
                  <div className="mt-2 text-sm text-blue-700">
                    <div>✅ 생성: {uploadResult.created}개</div>
                    <div>🔄 업데이트: {uploadResult.updated}개</div>
                    {uploadResult.failed > 0 && (
                      <div className="text-red-600">
                        ❌ 실패: {uploadResult.failed}개
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      총 {uploadResult.total}개 중{" "}
                      {uploadResult.created + uploadResult.updated}개 처리 완료
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="mb-2 block">
                    파일 선택 (CSV, JSON 또는 PDF)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.json,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFile(file);
                          setUploadResult(null);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    {uploadFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {uploadFile.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-muted bg-muted/50 p-4">
                  <div className="mb-2 text-sm font-medium">파일 형식 예시</div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <strong>CSV:</strong>{" "}
                      name,iso_code,purchase_link,image_url,manufacturer,category,description
                    </div>
                    <div>
                      <strong>JSON:</strong> [{"{"}"name": "상품명", "iso_code":
                      "15 09", "purchase_link": "https://..."{"}"}]
                    </div>
                    <div>
                      <strong>PDF:</strong> 제품 카탈로그 PDF 파일. 보조기기
                      관련 제품명과 가격 정보를 자동으로 추출합니다. (개선된
                      필터링 적용)
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground/70">
                      * 가격(price) 필드는 선택 사항입니다. 생략 가능합니다. *
                      PDF는 보조기기 관련 키워드가 포함된 제품만 추출됩니다.
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      파일 업로드 및 등록
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <a
                    href="/scripts/example-products.csv"
                    download
                    className="text-sm text-primary hover:underline"
                  >
                    <Download className="mr-1 inline h-4 w-4" />
                    CSV 예제 파일 다운로드
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 크롤링 */}
        <TabsContent value="crawl">
          <Card>
            <CardHeader>
              <CardTitle>웹 크롤링</CardTitle>
              <CardDescription>
                웹사이트 URL을 입력하면 HTML 파싱을 통해 제품 정보를 자동으로
                수집합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              {crawlResult && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  {crawlResult}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="crawl-url" className="mb-2 block font-medium">
                    웹사이트 URL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="crawl-url"
                    placeholder="예: https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011"
                    value={crawlValues.url}
                    onChange={(e) =>
                      setCrawlValues((prev) => ({
                        ...prev,
                        url: e.target.value,
                      }))
                    }
                    className="font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    제품 목록 페이지 URL을 입력하세요. HTML 파싱을 통해 자동으로
                    크롤링됩니다.
                  </p>
                </div>
                <div>
                  <Label htmlFor="crawl-max" className="mb-2 block">
                    최대 수집 개수
                  </Label>
                  <Input
                    id="crawl-max"
                    type="number"
                    min="1"
                    max="200"
                    value={crawlValues.max}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 숫자만 허용하고, 1 이상의 값만 허용
                      if (
                        value === "" ||
                        (parseInt(value) >= 1 && parseInt(value) <= 200)
                      ) {
                        setCrawlValues((prev) => ({
                          ...prev,
                          max: value,
                        }));
                      }
                    }}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    입력된 값: {crawlValues.max || "30"}개
                  </p>
                </div>
              </div>
              <Button
                onClick={isCrawling ? handleCrawlStop : handleCrawl}
                disabled={!isCrawling && !crawlValues.url}
                className="w-full"
                variant={isCrawling ? "destructive" : "default"}
              >
                {isCrawling ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    크롤링 중단
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    크롤링 시작
                  </>
                )}
              </Button>
              <div className="rounded-lg border border-muted bg-muted/50 p-4">
                <div className="mb-2 text-sm font-medium">사용 예시</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    • 에이블라이프:
                    https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011
                  </div>
                  <div>
                    • 휠로피아:
                    https://www.wheelopia.co.kr/shop/goods/goods_list.php?category=011001
                  </div>
                  <div>
                    • ISO 코드는 추후 자동 매칭 로직에서 products DB 데이터에
                    자동으로 할당됩니다.
                  </div>
                </div>
              </div>

              {/* 크롤링 로그 */}
              {crawlLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">크롤링 로그</CardTitle>
                    <CardDescription>
                      크롤링 진행 상황 및 오류 메시지
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32 w-full rounded-md border p-4">
                      <div className="space-y-1 text-xs font-mono">
                        {crawlLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={
                              log.includes("❌") || log.includes("오류")
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* 크롤링 결과 미리보기 */}
              {crawlPreview.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          크롤링 결과 미리보기
                          {isInferringIso && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              (ISO 코드 추론 중...)
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {selectedPreviewProducts.size}개 선택됨 / 전체{" "}
                          {crawlPreview.length}개
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (
                              selectedPreviewProducts.size ===
                              crawlPreview.length
                            ) {
                              setSelectedPreviewProducts(new Set());
                            } else {
                              setSelectedPreviewProducts(
                                new Set(crawlPreview.map((p) => p.id))
                              );
                            }
                          }}
                        >
                          {selectedPreviewProducts.size === crawlPreview.length
                            ? "전체 해제"
                            : "전체 선택"}
                        </Button>
                        <Button
                          onClick={handleRegisterSelected}
                          disabled={
                            selectedPreviewProducts.size === 0 || isRegistering
                          }
                          size="sm"
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              등록 중...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              선택한 상품 등록 ({selectedPreviewProducts.size}
                              개)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  selectedPreviewProducts.size ===
                                    crawlPreview.length &&
                                  crawlPreview.length > 0
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPreviewProducts(
                                      new Set(crawlPreview.map((p) => p.id))
                                    );
                                  } else {
                                    setSelectedPreviewProducts(new Set());
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>상품명</TableHead>
                            <TableHead>ISO 코드</TableHead>
                            <TableHead>가격</TableHead>
                            <TableHead>구매 링크</TableHead>
                            <TableHead>이미지</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {crawlPreview.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedPreviewProducts.has(
                                    product.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(
                                      selectedPreviewProducts
                                    );
                                    if (checked) {
                                      newSelected.add(product.id);
                                    } else {
                                      newSelected.delete(product.id);
                                    }
                                    setSelectedPreviewProducts(newSelected);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {product.name}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <IsoCodeSelector
                                    value={product.iso_code || ""}
                                    onValueChange={(newIsoCode) => {
                                      setCrawlPreview((prev) =>
                                        prev.map((p) =>
                                          p.id === product.id
                                            ? {
                                                ...p,
                                                iso_code: newIsoCode || null,
                                              }
                                            : p
                                        )
                                      );
                                    }}
                                    placeholder="ISO 코드 선택"
                                  />
                                  {product.inferredIsoCode && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                      title="자동 추론된 ISO 코드"
                                    >
                                      추론됨
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.price
                                  ? `${product.price.toLocaleString()}원`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {product.purchase_link ? (
                                  <a
                                    href={product.purchase_link}
                                    target="_blank"
                                    rel="nofollow sponsored noreferrer"
                                    className="text-primary hover:underline text-xs truncate max-w-[200px] block"
                                  >
                                    {product.purchase_link}
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-12 w-12 object-cover rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상품 목록 */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>상품 목록</CardTitle>
              <CardDescription>
                {filteredAndSortedProducts.length === products.length
                  ? `전체 ${products.length}개 중 ${Math.min(
                      visibleProducts.length,
                      products.length
                    )}개 표시`
                  : `검색 결과: ${filteredAndSortedProducts.length}개 중 ${visibleProducts.length}개 표시 / 전체 ${products.length}개`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 검색 및 필터 컨트롤 */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                {/* 검색 */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="상품명, ISO 코드, 제조사 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* ISO 코드 필터 */}
                <Select
                  value={selectedIsoCode}
                  onValueChange={setSelectedIsoCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ISO 코드" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 ISO 코드</SelectItem>
                    <SelectItem value="no-iso">
                      ISO 코드 없음 (
                      {
                        products.filter(
                          (p) =>
                            !p.iso_code ||
                            p.iso_code === "N999999" ||
                            p.iso_code.trim() === ""
                        ).length
                      }
                      개)
                    </SelectItem>
                    {uniqueIsoCodes.map((iso) => (
                      <SelectItem key={iso} value={iso}>
                        ISO {iso} ({productCountByIso[iso]}개)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 카테고리 필터 */}
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 정렬 */}
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated-desc">
                      최근 업데이트순
                    </SelectItem>
                    <SelectItem value="updated-asc">
                      오래된 업데이트순
                    </SelectItem>
                    <SelectItem value="name-asc">이름순 (가나다)</SelectItem>
                    <SelectItem value="name-desc">이름순 (역순)</SelectItem>
                    <SelectItem value="price-asc">가격 낮은순</SelectItem>
                    <SelectItem value="price-desc">가격 높은순</SelectItem>
                  </SelectContent>
                </Select>

                {/* 표시 개수 */}
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(parseInt(value, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="표시 개수" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}개씩 보기
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 상태 필터 */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-muted-foreground">상태:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("all")}
                  >
                    전체
                  </Button>
                  <Button
                    variant={
                      selectedStatus === "active" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedStatus("active")}
                  >
                    활성
                  </Button>
                  <Button
                    variant={
                      selectedStatus === "inactive" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedStatus("inactive")}
                  >
                    비활성
                  </Button>
                </div>
              </div>

              {/* 필터 초기화 버튼 및 ISO 코드 일괄 추론 버튼 */}
              <div className="flex justify-between items-center">
                {filteredAndSortedProducts.some(
                  (p) =>
                    !p.iso_code ||
                    p.iso_code === "N999999" ||
                    p.iso_code.trim() === ""
                ) && (
                  <Button
                    onClick={handleBatchInferIsoCodes}
                    disabled={isInferringIso}
                    variant="outline"
                    size="sm"
                  >
                    {isInferringIso ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        추론 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        ISO 코드 없음 일괄 추론 (
                        {
                          filteredAndSortedProducts.filter(
                            (p) =>
                              !p.iso_code ||
                              p.iso_code === "N999999" ||
                              p.iso_code.trim() === ""
                          ).length
                        }
                        개)
                      </>
                    )}
                  </Button>
                )}
                {(searchQuery ||
                  selectedIsoCode !== "all" ||
                  selectedCategory !== "all" ||
                  selectedStatus !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedIsoCode("all");
                      setSelectedCategory("all");
                      setSelectedStatus("all");
                    }}
                  >
                    <X className="mr-2 size-4" />
                    필터 초기화
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 일괄 작업 바 */}
          {selectedProducts.size > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {selectedProducts.size}개 선택됨
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleInferIsoForSelected}
                      disabled={isInferringIso}
                    >
                      {isInferringIso ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          추론 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          선택한 상품 ISO 코드 추론 ({selectedProducts.size}개)
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                    >
                      {isBulkDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          삭제 중...
                        </>
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          선택 삭제
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProducts(new Set())}
                    >
                      선택 해제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6">
            {filteredAndSortedProducts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {products.length === 0
                    ? "아직 등록된 상품이 없습니다."
                    : "검색 조건에 맞는 상품이 없습니다."}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 전체 선택 체크박스 */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={
                          visibleProducts.length > 0 &&
                          visibleProducts.every((p) =>
                            selectedProducts.has(p.id)
                          )
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked === true, visibleProducts)
                        }
                        aria-label="전체 선택"
                        className="h-5 w-5"
                      />
                      <Label
                        className="text-base font-semibold cursor-pointer text-foreground"
                        onClick={() =>
                          handleSelectAll(
                            !(
                              visibleProducts.length > 0 &&
                              visibleProducts.every((p) =>
                                selectedProducts.has(p.id)
                              )
                            ),
                            visibleProducts
                          )
                        }
                      >
                        전체 선택
                      </Label>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-sm font-medium"
                      >
                        {selectedProducts.size} / {visibleProducts.length}개
                        선택됨
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    count={productCountByIso[product.iso_code]}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isSelected={selectedProducts.has(product.id)}
                    onSelect={(checked) =>
                      handleSelectProduct(product.id, checked)
                    }
                  />
                ))}
              </>
            )}

            {/* 페이지네이션 */}
            {filteredAndSortedProducts.length > 0 && totalPages > 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {((currentPage - 1) * pageSize + 1).toLocaleString()} -{" "}
                      {Math.min(
                        currentPage * pageSize,
                        filteredAndSortedProducts.length
                      ).toLocaleString()}
                      개 / 전체{" "}
                      {filteredAndSortedProducts.length.toLocaleString()}개
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        이전
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="min-w-[40px]"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        다음
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ProductCardProps = {
  product: AdminProduct;
  count: number;
  onUpdate: (id: string, updates: Partial<AdminProduct>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
};

function ProductCard({
  product,
  count,
  onUpdate,
  onDelete,
  isSelected = false,
  onSelect,
}: ProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [localValues, setLocalValues] = useState({
    name: product.name,
    iso_code: product.iso_code,
    price: product.price?.toString() ?? "",
    purchase_link: product.purchase_link ?? "",
    description: product.description ?? "",
    image_url: product.image_url ?? "",
    manufacturer: product.manufacturer ?? "",
    category: product.category ?? "",
    is_active: product.is_active,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setPending(true);
    setErrorMessage(null);
    try {
      await onUpdate(product.id, {
        name: localValues.name,
        iso_code: localValues.iso_code,
        price: localValues.price ? Number(localValues.price) : null,
        purchase_link: localValues.purchase_link || null,
        description: localValues.description || null,
        image_url: localValues.image_url || null,
        manufacturer: localValues.manufacturer || null,
        category: localValues.category || null,
        is_active: localValues.is_active,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("[Admin Products] Update error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "상품 수정에 실패했습니다."
      );
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${product.name}" 상품을 삭제할까요?`)) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    try {
      await onDelete(product.id);
    } catch (error) {
      console.error("[admin products] delete_error", error);
      setErrorMessage(
        error instanceof Error ? error.message : "상품 삭제에 실패했습니다."
      );
      setPending(false);
    }
  };

  return (
    <Card
      className={`border-border/70 ${
        isSelected ? "border-primary ring-2 ring-primary/20" : ""
      }`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(checked === true)}
              aria-label="상품 선택"
              className="mt-1"
            />
          )}
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{product.name}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">ISO {product.iso_code}</Badge>
              <Badge variant={product.is_active ? "outline" : "destructive"}>
                {product.is_active ? "활성" : "비활성"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {count}개 상품 / 업데이트{" "}
                {product.updated_at
                  ? new Date(product.updated_at).toLocaleDateString("ko-KR")
                  : "-"}
              </span>
            </CardDescription>
          </div>
        </div>
        {!isEditing && (
          <CardActionButtons
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
            editLabel="상품 수정"
            deleteLabel="상품 삭제"
            isDeleteDisabled={pending}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="edit-name"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  상품 이름
                </Label>
                <Input
                  id="edit-name"
                  value={localValues.name}
                  onChange={(event) =>
                    setLocalValues((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-iso"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  ISO 코드
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-iso"
                    value={localValues.iso_code}
                    onChange={(event) =>
                      setLocalValues((prev) => ({
                        ...prev,
                        iso_code: event.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          "/api/admin/products/infer-iso",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name: localValues.name,
                              description: localValues.description,
                            }),
                          }
                        );
                        if (response.ok) {
                          const data = await response.json();
                          if (data.isoCode) {
                            setLocalValues((prev) => ({
                              ...prev,
                              iso_code: data.isoCode,
                            }));
                          }
                        }
                      } catch (error) {
                        console.error("[Admin Products] ISO 추론 실패:", error);
                      }
                    }}
                    className="whitespace-nowrap"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI 추론
                  </Button>
                </div>
              </div>
              <div>
                <Label
                  htmlFor="edit-link"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  구매 링크
                </Label>
                <Input
                  id="edit-link"
                  value={localValues.purchase_link}
                  onChange={(event) =>
                    setLocalValues((prev) => ({
                      ...prev,
                      purchase_link: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-image"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  이미지 URL
                </Label>
                <Input
                  id="edit-image"
                  value={localValues.image_url}
                  onChange={(event) =>
                    setLocalValues((prev) => ({
                      ...prev,
                      image_url: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-manufacturer"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  제조사
                </Label>
                <Input
                  id="edit-manufacturer"
                  value={localValues.manufacturer}
                  onChange={(event) =>
                    setLocalValues((prev) => ({
                      ...prev,
                      manufacturer: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-category"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  카테고리
                </Label>
                <Input
                  id="edit-category"
                  value={localValues.category}
                  onChange={(event) =>
                    setLocalValues((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                  placeholder="예: naver, 11st"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={localValues.is_active}
                  onCheckedChange={(checked) =>
                    setLocalValues((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="edit-active" className="text-sm">
                  활성 상태
                </Label>
              </div>
            </div>
            <div>
              <Label
                htmlFor="edit-description"
                className="text-xs text-muted-foreground mb-1 block"
              >
                설명
              </Label>
              <Textarea
                id="edit-description"
                value={localValues.description}
                onChange={(event) =>
                  setLocalValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={pending}
              >
                취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={pending}>
                {pending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {product.image_url && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
            <div className="grid gap-2 text-sm">
              {product.price && (
                <div>
                  <span className="text-muted-foreground">가격:</span>{" "}
                  <span className="font-medium">
                    {product.price.toLocaleString()}원
                  </span>
                </div>
              )}
              {product.manufacturer && (
                <div>
                  <span className="text-muted-foreground">제조사:</span>{" "}
                  <span>{product.manufacturer}</span>
                </div>
              )}
              {product.category && (
                <div>
                  <span className="text-muted-foreground">카테고리:</span>{" "}
                  <Badge variant="outline">{product.category}</Badge>
                </div>
              )}
              {product.purchase_link && (
                <div className="truncate">
                  <span className="text-muted-foreground">구매 링크:</span>{" "}
                  <a
                    href={product.purchase_link}
                    className="text-primary underline hover:text-primary/80"
                    target="_blank"
                    rel="nofollow sponsored noreferrer"
                  >
                    {product.purchase_link}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

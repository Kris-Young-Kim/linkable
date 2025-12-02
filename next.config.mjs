/** @type {import('next').NextConfig} */
const SYSTEM_FILES_TO_IGNORE = [
  // Windows 시스템 파일 (glob 패턴)
  "**/DumpStack.log.tmp",
  "**/hiberfil.sys",
  "**/pagefile.sys",
  "**/swapfile.sys",
  // Windows 시스템 파일 (절대 경로 - glob 패턴으로 표현)
  "C:/DumpStack.log.tmp",
  "C:/hiberfil.sys",
  "C:/pagefile.sys",
  "C:/swapfile.sys",
  "c:/DumpStack.log.tmp",
  "c:/hiberfil.sys",
  "c:/pagefile.sys",
  "c:/swapfile.sys",
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const currentWatchOptions = config.watchOptions || {}
      const ignored = currentWatchOptions.ignored

      // 기존 ignored가 RegExp인 경우 문자열로 변환 불가하므로 새 배열 생성
      const ignoredList = Array.isArray(ignored)
        ? ignored.filter((pattern) => typeof pattern === "string" && pattern.length > 0)
        : typeof ignored === "string" && ignored.length > 0
          ? [ignored]
          : []

      config.watchOptions = {
        ...currentWatchOptions,
        ignored: [
          ...ignoredList,
          ...SYSTEM_FILES_TO_IGNORE,
          // node_modules와 .next는 기본적으로 무시되지만 명시적으로 추가
          "**/node_modules/**",
          "**/.next/**",
        ],
        // Windows에서 파일 시스템 감시 최적화
        followSymlinks: false,
        // 폴링 대신 네이티브 파일 시스템 이벤트 사용
        poll: false,
      }
    }

    return config
  },
}

export default nextConfig

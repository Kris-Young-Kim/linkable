/** @type {import('next').NextConfig} */
const SYSTEM_FILES_TO_IGNORE = [
  "**/DumpStack.log.tmp",
  "**/hiberfil.sys",
  "**/pagefile.sys",
  "**/swapfile.sys",
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const currentWatchOptions = config.watchOptions || {}
      const ignored = currentWatchOptions.ignored

      const ignoredList = (Array.isArray(ignored) ? ignored : ignored ? [ignored] : []).filter(
        (pattern) => typeof pattern === "string" && pattern.length > 0,
      )

      config.watchOptions = {
        ...currentWatchOptions,
        ignored: [...ignoredList, ...SYSTEM_FILES_TO_IGNORE],
      }
    }

    return config
  },
}

export default nextConfig

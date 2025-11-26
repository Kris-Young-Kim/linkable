/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        ...(config.watchOptions?.ignored || []),
        "C:/DumpStack.log.tmp",
        "C:/hiberfil.sys",
        "C:/pagefile.sys",
        "C:/swapfile.sys",
      ],
    }
    return config
  },
}

export default nextConfig

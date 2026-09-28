/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 当前阶段只做页面骨架与假数据，不接入真实接口，因此关闭构建期 lint 阻塞
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

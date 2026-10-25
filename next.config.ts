import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/calendar/feed.ics",
        destination: "/api/calendar/feed",
      },
      {
        source: "/calendar.ics",
        destination: "/api/calendar/feed",
      },
    ];
  },
};

export default nextConfig;

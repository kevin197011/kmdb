export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 背景圆形渐变 */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="serverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* 主背景 */}
      <rect x="4" y="4" width="56" height="56" rx="12" fill="url(#bgGradient)" />

      {/* 服务器堆叠 - 左侧 */}
      <g>
        {/* 服务器 1 */}
        <rect x="10" y="16" width="18" height="8" rx="2" fill="white" fillOpacity="0.9" />
        <circle cx="14" cy="20" r="1.5" fill="#10B981" />
        <rect x="18" y="19" width="6" height="2" rx="1" fill="#CBD5E1" />

        {/* 服务器 2 */}
        <rect x="10" y="28" width="18" height="8" rx="2" fill="white" fillOpacity="0.9" />
        <circle cx="14" cy="32" r="1.5" fill="#10B981" />
        <rect x="18" y="31" width="6" height="2" rx="1" fill="#CBD5E1" />

        {/* 服务器 3 */}
        <rect x="10" y="40" width="18" height="8" rx="2" fill="white" fillOpacity="0.9" />
        <circle cx="14" cy="44" r="1.5" fill="#F59E0B" />
        <rect x="18" y="43" width="6" height="2" rx="1" fill="#CBD5E1" />
      </g>

      {/* DevOps 无限循环符号 - 右侧 */}
      <g transform="translate(34, 24)">
        <path
          d="M8 8C8 4 11 2 14 2C17 2 20 4 20 8C20 12 17 14 14 14C11 14 8 12 8 8Z"
          stroke="url(#infinityGradient)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M20 8C20 12 17 14 14 14"
          stroke="#34D399"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* 箭头 */}
        <path
          d="M18 5L20.5 8L18 11"
          stroke="#34D399"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* 连接线 - 服务器到循环 */}
      <path
        d="M28 32 L34 32"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="2 2"
        strokeOpacity="0.7"
      />

      {/* 齿轮装饰 - 右下角 */}
      <g transform="translate(44, 44)">
        <circle cx="6" cy="6" r="4" stroke="white" strokeWidth="1.5" fill="none" strokeOpacity="0.8" />
        <circle cx="6" cy="6" r="1.5" fill="white" fillOpacity="0.8" />
        {/* 齿轮齿 */}
        <path d="M6 1V0M6 12V11M1 6H0M12 6H11M2.5 2.5L1.8 1.8M10.2 10.2L9.5 9.5M2.5 9.5L1.8 10.2M10.2 1.8L9.5 2.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
      </g>
    </svg>
  )
}


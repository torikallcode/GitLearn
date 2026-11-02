const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

function Icon({ children, className = 'h-5 w-5', ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const HomeIcon = (p) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-7h6v7" />
  </Icon>
)
export const MapIcon = (p) => (
  <Icon {...p}>
    <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </Icon>
)
export const TerminalIcon = (p) => (
  <Icon {...p}>
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path d="m7 9 3 3-3 3M13 15h4" />
  </Icon>
)
export const BookIcon = (p) => (
  <Icon {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Icon>
)
export const FlameIcon = (p) => (
  <Icon {...p}>
    <path d="M12 22c4 0 6.5-2.6 6.5-6 0-2.4-1.2-4.2-2.7-5.7C14.3 8.8 13 7 13 4c-2.8 1.4-4.5 4-4.5 6.5 0 1 .3 1.8.7 2.5-1-.3-1.7-1-2.2-2C6.4 12.6 5.5 14 5.5 16c0 3.4 2.5 6 6.5 6Z" />
  </Icon>
)
export const TrophyIcon = (p) => (
  <Icon {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4" />
  </Icon>
)
export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)
export const SunIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)
export const MoonIcon = (p) => (
  <Icon {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Icon>
)
export const MenuIcon = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
)
export const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
export const ChevronRightIcon = (p) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)
export const ChevronDownIcon = (p) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)
export const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Icon>
)
export const CheckCircleIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.7 2.7L16.5 9" />
  </Icon>
)
export const XCircleIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Icon>
)
export const LockIcon = (p) => (
  <Icon {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Icon>
)
export const RotateIcon = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
)
export const BulbIcon = (p) => (
  <Icon {...p}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-1.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 2Z" />
  </Icon>
)
export const ArrowRightIcon = (p) => (
  <Icon {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
)
export const ArrowLeftIcon = (p) => (
  <Icon {...p}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </Icon>
)
export const CopyIcon = (p) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2 2 0 0 0-2 2v8.5A2.5 2.5 0 0 0 6.5 16" />
  </Icon>
)
export const AwardIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="m8.5 14-1.5 8 5-2.5 5 2.5-1.5-8" />
  </Icon>
)
export const UserIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)
export const LogOutIcon = (p) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icon>
)
export const PlayIcon = (p) => (
  <Icon {...p}>
    <path d="m7 4 13 8-13 8V4Z" />
  </Icon>
)
export const BranchIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="5" r="2.5" />
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="9" r="2.5" />
    <path d="M6 7.5v9M18 11.5c0 3-3 4-6 4H8" />
  </Icon>
)
export const SparklesIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 14l.7 1.8L7.5 16l-1.8.7L5 18.5l-.7-1.8L2.5 16l1.8-.7L5 14Z" />
  </Icon>
)
export const ClockIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
export const ExternalIcon = (p) => (
  <Icon {...p}>
    <path d="M14 3h7v7M21 3l-9 9" />
    <path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
  </Icon>
)
export const EyeIcon = (p) => (
  <Icon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)
export const EyeOffIcon = (p) => (
  <Icon {...p}>
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.1-.8" />
  </Icon>
)
export const ZapIcon = (p) => (
  <Icon {...p}>
    <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
  </Icon>
)
export const TargetIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" />
  </Icon>
)
export const CodeIcon = (p) => (
  <Icon {...p}>
    <path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />
  </Icon>
)
export const SearchXIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M8 8l6 6M14 8l-6 6" />
  </Icon>
)
export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </Icon>
)
export const ArrowUpRightIcon = (p) => (
  <Icon {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Icon>
)
export const XIcon = CloseIcon

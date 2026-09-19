import { Avatar, Badge } from '@mantine/core'

const AVATAR_COLORS = ['brand', 'teal', 'indigo', 'grape', 'cyan', 'lime', 'pink', 'yellow']

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

export function CustomerAvatar({ name, size = 44 }) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <Avatar size={size} radius="xl" color={AVATAR_COLORS[hash % AVATAR_COLORS.length]} variant="light">
      {initials(name)}
    </Avatar>
  )
}

export function BalancePill({ credits, size = 'lg' }) {
  const color = credits <= 0 ? 'gray' : credits <= 2 ? 'yellow' : 'green'
  return (
    <Badge className="balance-pill" size={size} color={color} variant="light" tt="none" fw={700}>
      {credits <= 0 ? 'Plan finished' : `${credits} left`}
    </Badge>
  )
}

export function lastVisitLabel(iso) {
  if (!iso) return 'Never visited'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Visited today'
  if (days === 1) return 'Visited yesterday'
  if (days < 30) return `Visited ${days} days ago`
  return `Last visit ${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

export function customerHint(c) {
  return [c.phone, c.notes, lastVisitLabel(c.lastVisitAt)].filter(Boolean).join(' · ')
}

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
  const color = credits <= 0 ? 'red' : credits <= 2 ? 'yellow' : 'green'
  return (
    <Badge className="balance-pill" size={size} color={color} variant="light" tt="none" fw={700}>
      {credits} left
    </Badge>
  )
}

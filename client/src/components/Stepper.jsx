import { ActionIcon, Group, Text } from '@mantine/core'

export function Stepper({ value, onChange, min = 1, max = 99 }) {
  return (
    <Group justify="center" gap="lg">
      <ActionIcon size={56} radius="xl" variant="light" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Less">
        <Text size="xl" fw={700}>−</Text>
      </ActionIcon>
      <Text fw={800} style={{ fontSize: 44, minWidth: 60, textAlign: 'center' }}>{value}</Text>
      <ActionIcon size={56} radius="xl" variant="light" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">
        <Text size="xl" fw={700}>+</Text>
      </ActionIcon>
    </Group>
  )
}

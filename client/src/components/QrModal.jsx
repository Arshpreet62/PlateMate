import { Button, Center, Modal, Stack, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'

export function QrModal({ opened, onClose, customer, onRegenerated }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  const regenerate = () =>
    modals.openConfirmModal({
      title: 'Replace this QR code?',
      children: <Text size="sm">The old code will stop working. Anyone who saved it will need the new one.</Text>,
      labels: { confirm: 'Replace', cancel: 'Keep current' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setBusy(true)
        try {
          const { qr } = await api(`/customers/${customer.id}/regenerate-qr`, { method: 'POST' })
          onRegenerated(qr)
          notifications.show({ color: 'green', message: 'New QR code issued' })
        } catch (err) {
          notifications.show({ color: 'red', message: err.message })
        } finally {
          setBusy(false)
        }
      },
    })

  return (
    <Modal opened={opened} onClose={onClose} fullScreen title={customer.name} withCloseButton>
      <Stack align="center" justify="center" pt="xl">
        <Center bg="white" p="lg" style={{ borderRadius: 16 }}>
          <QRCodeSVG value={customer.qr} size={280} level="M" />
        </Center>
        <Text ta="center" c="dimmed" px="md">
          Let the customer take a photo of this. They (or a friend) can show it at the counter.
        </Text>
        <Button size="xl" fullWidth onClick={onClose} mt="md">Done</Button>
        {user.role === 'OWNER' && (
          <Button variant="subtle" color="red" loading={busy} onClick={regenerate}>
            Replace QR code
          </Button>
        )}
      </Stack>
    </Modal>
  )
}

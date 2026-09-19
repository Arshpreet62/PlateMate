import { Button, Modal, Stack, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { QrPass } from './QrPass.jsx'

export function QrModal({ opened, onClose, customer, onRegenerated }) {
  const { user } = useAuth()

  const regenerate = () =>
    modals.openConfirmModal({
      title: 'Replace this QR code?',
      children: <Text size="sm">The old code will stop working. Anyone who saved it will need the new one.</Text>,
      labels: { confirm: 'Replace', cancel: 'Keep current' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { qr } = await api(`/customers/${customer.id}/regenerate-qr`, { method: 'POST' })
          onRegenerated(qr)
          notifications.show({ color: 'green', message: 'New QR code issued' })
        } catch (err) {
          notifications.show({ color: 'red', message: err.message })
        }
      },
    })

  return (
    <Modal opened={opened} onClose={onClose} fullScreen title={customer.name} withCloseButton>
      <Stack pt="md">
        <QrPass customer={customer} />
        <Button variant="light" color="gray" fullWidth onClick={onClose}>Done</Button>
        {user.role === 'OWNER' && (
          <Button variant="subtle" color="red" size="sm" onClick={regenerate}>
            Replace QR code
          </Button>
        )}
      </Stack>
    </Modal>
  )
}

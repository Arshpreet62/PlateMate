import { Button, Modal, Stack } from '@mantine/core'
import { QrPass } from './QrPass.jsx'

export function QrModal({ opened, onClose, customer }) {
  return (
    <Modal opened={opened} onClose={onClose} fullScreen title={customer.name} withCloseButton>
      <Stack pt="md">
        <QrPass customer={customer} />
        <Button variant="light" color="gray" fullWidth onClick={onClose}>Done</Button>
      </Stack>
    </Modal>
  )
}

import { Button, Modal, Stack } from '@mantine/core'
import { QrPass } from './QrPass.jsx'

export function QrModal({ opened, onClose, customer, onReplace }) {
  return (
    <Modal opened={opened} onClose={onClose} fullScreen title={customer.name} withCloseButton>
      <Stack pt="md">
        <QrPass customer={customer} />
        <Button variant="light" color="gray" fullWidth onClick={onClose}>Done</Button>
        <Button
          variant="subtle"
          color="red"
          size="sm"
          onClick={() => { onClose(); onReplace() }}
        >
          Replace this pass
        </Button>
      </Stack>
    </Modal>
  )
}

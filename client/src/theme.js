import { createTheme } from '@mantine/core'

// Brand colors live here; swap the palette to reskin the whole app.
export const theme = createTheme({
  primaryColor: 'orange',
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: '700' },
  components: {
    Button: { defaultProps: { size: 'lg' } },
    TextInput: { defaultProps: { size: 'lg' } },
    PasswordInput: { defaultProps: { size: 'lg' } },
    NumberInput: { defaultProps: { size: 'lg' } },
    Textarea: { defaultProps: { size: 'lg' } },
  },
})

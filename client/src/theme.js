import { createTheme, rem } from '@mantine/core'

// Brand colors live here; swap the palette to reskin the whole app.
export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: {
    brand: [
      '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8',
      '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
    ],
  },
  defaultRadius: 'lg',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif',
  headings: { fontWeight: '800', fontFamily: 'inherit', sizes: { h3: { lineHeight: '1.25' } } },
  fontSizes: { md: rem(17), lg: rem(19), xl: rem(22) },
  components: {
    Button: { defaultProps: { size: 'lg', radius: 'xl' } },
    ActionIcon: { defaultProps: { radius: 'xl' } },
    TextInput: { defaultProps: { size: 'lg', radius: 'lg' } },
    NumberInput: { defaultProps: { size: 'lg', radius: 'lg' } },
    Textarea: { defaultProps: { size: 'lg', radius: 'lg' } },
    Card: { defaultProps: { radius: 'lg', padding: 'md' } },
    Badge: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { radius: 'lg', centered: true } },
    Drawer: {
      defaultProps: {
        position: 'bottom',
        styles: {
          content: { height: 'auto', maxHeight: '92dvh', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
          title: { fontWeight: 700, fontSize: 18 },
        },
      },
    },
  },
})

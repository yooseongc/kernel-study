export interface KernelTopic {
  id: string
  number: number
  title: string
  subtitle: string
  description: string
  route: string
  vizType: 'D3' | 'Three.js' | 'Mixed'
  tags: string[]
  implemented: boolean
}

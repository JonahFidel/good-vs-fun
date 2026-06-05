export type Deck = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  movieCount?: number
  isExample?: boolean
}

export type Movie = {
  id: string
  title: string
  fun: number
  good: number
  createdAt?: string
}


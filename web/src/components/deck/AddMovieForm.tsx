import { ScoreSlider } from './ScoreSlider'
import { snapScoreToStep } from '../../lib/format'
import { SidebarCollapse } from './SidebarCollapse'

export function AddMovieForm({
  title,
  fun,
  good,
  onTitleChange,
  onFunChange,
  onGoodChange,
  onSubmit,
}: {
  title: string
  fun: number
  good: number
  onTitleChange: (value: string) => void
  onFunChange: (value: number) => void
  onGoodChange: (value: number) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <SidebarCollapse
      title="Add a movie"
      heading
      className="deck-sidebar-section deck-sidebar-section--add"
    >
      <form className="movie-form movie-form--compact" onSubmit={onSubmit}>
        <label className="field">
          <span>Movie title</span>
          <input
            type="text"
            placeholder="e.g. Jurassic Park"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            required
          />
        </label>
        <div className="score-sliders score-sliders--add">
          <ScoreSlider
            label="Fun"
            value={fun}
            onChange={(value) => onFunChange(snapScoreToStep(value))}
          />
          <ScoreSlider
            label="Good"
            value={good}
            onChange={(value) => onGoodChange(snapScoreToStep(value))}
          />
        </div>
        <button type="submit">Add movie</button>
      </form>
    </SidebarCollapse>
  )
}

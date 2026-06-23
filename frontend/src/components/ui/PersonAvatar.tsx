interface PersonLike {
  first_name?: string | null
  last_name?: string | null
  gender?: string
  profile_pic_url?: string | null
}

export default function PersonAvatar({
  person, size = 40, style = {},
}: {
  person: PersonLike; size?: number; style?: React.CSSProperties
}) {
  const initial = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?'
  const color = person.gender === 'male' ? '#00A7E1' : person.gender === 'female' ? '#e18ec4' : '#007EA7'

  return (
    <div
      className="avatar"
      style={{
        width: size, height: size, fontSize: size * 0.35,
        background: `${color}22`,
        color,
        border: `2px solid ${color}`,
        ...style,
      }}
    >
      {initial}
    </div>
  )
}

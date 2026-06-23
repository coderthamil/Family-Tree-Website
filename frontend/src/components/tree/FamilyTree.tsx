import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import ProfileCard from './ProfileCard'

interface TreeNode {
  id: string; name: string; first_name: string; last_name: string
  gender: string; dob: string | null; dod: string | null
  profile_pic_url: string | null; birth_place: string | null; occupation: string | null
  spouses: Array<{ 
    id: string; name: string; gender: string; profile_pic_url: string | null; marriage_date: string | null
    dob?: string | null; dod?: string | null; birth_place?: string | null; occupation?: string | null
  }>
  children: TreeNode[]
}

interface D3Node extends d3.HierarchyPointNode<TreeNode> {
  _children?: D3Node[] | null
}

const NODE_W = 240
const NODE_H = 100
const API_BASE = 'http://localhost:8000'

function genderColor(gender: string) {
  return gender === 'male' ? '#00A7E1' : gender === 'female' ? '#e18ec4' : '#007EA7'
}

export default function FamilyTree({ data, onUpdate }: { data: TreeNode; onUpdate?: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [treeData, setTreeData] = useState(data)

  // Synchronize state when data prop changes
  useEffect(() => {
    setTreeData(data)
  }, [data])

  const update = useCallback((source: any, root: any, treeLayout: any, svg: any, g: any) => {
    const nodes = root.descendants() as D3Node[]
    const links = root.links()

    const transition = d3.transition().duration(400).ease(d3.easeQuadInOut)

    // ── Nodes ─────────────────────────────────────────────────────────────
    const node = g.selectAll('g.node')
      .data(nodes, (d: any) => d.data.id) as any

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', `translate(${source.x0 ?? source.x},${source.y0 ?? source.y})`)
      .style('cursor', 'pointer')

    // Helper functions for horizontal positioning
    const xMain = (d: D3Node) => (d.data.spouses && d.data.spouses.length > 0 ? -NODE_W/2 - 15 : 0)
    const xSpouse = (d: D3Node) => (d.data.spouses && d.data.spouses.length > 0 ? NODE_W/2 + 15 : 0)

    // Main Card background
    nodeEnter.append('rect')
      .attr('x', (d: D3Node) => xMain(d) - NODE_W / 2)
      .attr('y', -NODE_H / 2)
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', 'var(--bg-card)')
      .attr('stroke', (d: D3Node) => `url(#${d.data.gender || 'unknown'}-grad)`)
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))')
      .on('click', (e: MouseEvent, d: D3Node) => {
        e.stopPropagation()
        setSelectedId(d.data.id)
        if (d.children) {
          (d as any)._children = d.children; (d as any).children = undefined
        } else if ((d as any)._children) {
          d.children = (d as any)._children; (d as any)._children = undefined
        }
        update(d, root, treeLayout, svg, g)
      })

    // Main Gender left border stripe
    nodeEnter.append('rect')
      .attr('x', (d: D3Node) => xMain(d) - NODE_W / 2)
      .attr('y', -NODE_H / 2)
      .attr('width', 4).attr('height', NODE_H)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', (d: D3Node) => `url(#${d.data.gender || 'unknown'}-grad)`)
      .style('pointer-events', 'none')

    // Main Avatar container group
    const avatarGroupMain = nodeEnter.append('g')
      .attr('class', 'avatar-group-main')
      .attr('transform', (d: D3Node) => `translate(${xMain(d) - NODE_W/2 + 36},0)`)
      .style('pointer-events', 'none')

    // Main Avatar background square
    avatarGroupMain.append('rect')
      .attr('x', -24).attr('y', -24)
      .attr('width', 48).attr('height', 48)
      .attr('rx', 8).attr('ry', 8)
      .attr('fill', (d: D3Node) => {
        const gender = d.data.gender || 'unknown'
        return gender === 'male' ? 'rgba(0,167,225,0.1)' : gender === 'female' ? 'rgba(225,142,196,0.1)' : 'rgba(0,126,167,0.1)'
      })
      .attr('stroke', (d: D3Node) => `url(#${d.data.gender || 'unknown'}-grad)`)
      .attr('stroke-width', 1.5)

    // Main Initials text
    avatarGroupMain.append('text')
      .attr('x', 0).attr('y', 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.95rem')
      .attr('font-weight', '700')
      .attr('fill', (d: D3Node) => genderColor(d.data.gender))
      .text((d: D3Node) => {
        const fn = d.data.first_name?.[0] || ''
        const ln = d.data.last_name?.[0] || ''
        return (fn + ln).toUpperCase() || '?'
      })

    // Main Image (if profile_pic_url exists)
    avatarGroupMain.append('image')
      .attr('x', -24)
      .attr('y', -24)
      .attr('width', 48)
      .attr('height', 48)
      .attr('clip-path', 'url(#avatar-clip-local)')
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('href', (d: D3Node) => d.data.profile_pic_url ? `${API_BASE}${d.data.profile_pic_url}` : '')
      .style('display', (d: D3Node) => d.data.profile_pic_url ? 'block' : 'none')

    // Main Name
    nodeEnter.append('text')
      .attr('x', (d: D3Node) => xMain(d) - NODE_W / 2 + 70).attr('y', -12)
      .attr('font-size', '0.85rem').attr('font-weight', '700')
      .attr('fill', 'var(--text-primary)')
      .text((d: D3Node) => {
        const name = d.data.name || 'Unknown'
        return name.length > 20 ? name.substring(0, 20) + '…' : name
      })
      .style('pointer-events', 'none')

    // Main Dates
    nodeEnter.append('text')
      .attr('x', (d: D3Node) => xMain(d) - NODE_W / 2 + 70).attr('y', 10)
      .attr('font-size', '0.7rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => {
        const b = d.data.dob ? d.data.dob.substring(0, 4) : '?'
        const de = d.data.dod ? d.data.dod.substring(0, 4) : ''
        return de ? `${b} – ${de}` : `b. ${b}`
      })
      .style('pointer-events', 'none')

    // Main Third line (Occupation or Birth place)
    nodeEnter.append('text')
      .attr('x', (d: D3Node) => xMain(d) - NODE_W / 2 + 70).attr('y', 28)
      .attr('font-size', '0.6rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => {
        if (d.data.occupation) {
          return d.data.occupation.length > 22 ? d.data.occupation.substring(0, 22) + '…' : d.data.occupation
        }
        if (d.data.birth_place) {
          return `b. ${d.data.birth_place.length > 22 ? d.data.birth_place.substring(0, 22) + '…' : d.data.birth_place}`
        }
        return ''
      })
      .style('pointer-events', 'none')

    // Main ID badge
    nodeEnter.append('text')
      .attr('x', (d: D3Node) => xMain(d) + NODE_W / 2 - 8).attr('y', -NODE_H / 2 + 16)
      .attr('text-anchor', 'end')
      .attr('font-size', '0.6rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => d.data.id)
      .style('pointer-events', 'none')


    // ── Spouse Card rendering (Filtered) ──────────────────────────────────
    const spouseNodes = nodeEnter.filter((d: D3Node) => d.data.spouses && d.data.spouses.length > 0)

    // Spouse Card background
    spouseNodes.append('rect')
      .attr('x', (d: D3Node) => xSpouse(d) - NODE_W / 2)
      .attr('y', -NODE_H / 2)
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', 'var(--bg-card)')
      .attr('stroke', (d: D3Node) => `url(#${d.data.spouses[0].gender || 'unknown'}-grad)`)
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))')
      .on('click', (e: MouseEvent, d: D3Node) => {
        e.stopPropagation()
        setSelectedId(d.data.spouses[0].id)
        if (d.children) {
          (d as any)._children = d.children; (d as any).children = undefined
        } else if ((d as any)._children) {
          d.children = (d as any)._children; (d as any)._children = undefined
        }
        update(d, root, treeLayout, svg, g)
      })

    // Spouse Gender left border stripe
    spouseNodes.append('rect')
      .attr('x', (d: D3Node) => xSpouse(d) - NODE_W / 2)
      .attr('y', -NODE_H / 2)
      .attr('width', 4).attr('height', NODE_H)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', (d: D3Node) => `url(#${d.data.spouses[0].gender || 'unknown'}-grad)`)
      .style('pointer-events', 'none')

    // Spouse Avatar container group
    const avatarGroupSpouse = spouseNodes.append('g')
      .attr('class', 'avatar-group-spouse')
      .attr('transform', (d: D3Node) => `translate(${xSpouse(d) - NODE_W/2 + 36},0)`)
      .style('pointer-events', 'none')

    // Spouse Avatar background square
    avatarGroupSpouse.append('rect')
      .attr('x', -24).attr('y', -24)
      .attr('width', 48).attr('height', 48)
      .attr('rx', 8).attr('ry', 8)
      .attr('fill', (d: D3Node) => {
        const gender = d.data.spouses[0].gender || 'unknown'
        return gender === 'male' ? 'rgba(0,167,225,0.1)' : gender === 'female' ? 'rgba(225,142,196,0.1)' : 'rgba(0,126,167,0.1)'
      })
      .attr('stroke', (d: D3Node) => `url(#${d.data.spouses[0].gender || 'unknown'}-grad)`)
      .attr('stroke-width', 1.5)

    // Spouse Initials text
    avatarGroupSpouse.append('text')
      .attr('x', 0).attr('y', 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.95rem')
      .attr('font-weight', '700')
      .attr('fill', (d: D3Node) => genderColor(d.data.spouses[0].gender))
      .text((d: D3Node) => {
        const s = d.data.spouses[0]
        const fn = s.name.split(' ')[0]?.[0] || ''
        const ln = s.name.split(' ').slice(1).join(' ')?.[0] || ''
        return (fn + ln).toUpperCase() || '?'
      })

    // Spouse Image (if profile_pic_url exists)
    avatarGroupSpouse.append('image')
      .attr('x', -24)
      .attr('y', -24)
      .attr('width', 48)
      .attr('height', 48)
      .attr('clip-path', 'url(#avatar-clip-local)')
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('href', (d: D3Node) => d.data.spouses[0].profile_pic_url ? `${API_BASE}${d.data.spouses[0].profile_pic_url}` : '')
      .style('display', (d: D3Node) => d.data.spouses[0].profile_pic_url ? 'block' : 'none')

    // Spouse Name
    spouseNodes.append('text')
      .attr('x', (d: D3Node) => xSpouse(d) - NODE_W / 2 + 70).attr('y', -12)
      .attr('font-size', '0.85rem').attr('font-weight', '700')
      .attr('fill', 'var(--text-primary)')
      .text((d: D3Node) => {
        const name = d.data.spouses[0].name || 'Unknown'
        return name.length > 20 ? name.substring(0, 20) + '…' : name
      })
      .style('pointer-events', 'none')

    // Spouse Dates
    spouseNodes.append('text')
      .attr('x', (d: D3Node) => xSpouse(d) - NODE_W / 2 + 70).attr('y', 10)
      .attr('font-size', '0.7rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => {
        const s = d.data.spouses[0]
        const b = s.dob ? s.dob.substring(0, 4) : '?'
        const de = s.dod ? s.dod.substring(0, 4) : ''
        return de ? `${b} – ${de}` : `b. ${b}`
      })
      .style('pointer-events', 'none')

    // Spouse Third line (Occupation or Birth place)
    spouseNodes.append('text')
      .attr('x', (d: D3Node) => xSpouse(d) - NODE_W / 2 + 70).attr('y', 28)
      .attr('font-size', '0.6rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => {
        const s = d.data.spouses[0]
        if (s.occupation) {
          return s.occupation.length > 22 ? s.occupation.substring(0, 22) + '…' : s.occupation
        }
        if (s.birth_place) {
          return `b. ${s.birth_place.length > 22 ? s.birth_place.substring(0, 22) + '…' : s.birth_place}`
        }
        return ''
      })
      .style('pointer-events', 'none')

    // Spouse ID badge
    spouseNodes.append('text')
      .attr('x', (d: D3Node) => xSpouse(d) + NODE_W / 2 - 8).attr('y', -NODE_H / 2 + 16)
      .attr('text-anchor', 'end')
      .attr('font-size', '0.6rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => d.data.spouses[0].id)
      .style('pointer-events', 'none')


    // ── Marriage horizontal union line and ring ───────────────────────────
    // Dashed horizontal line connecting main and spouse
    spouseNodes.append('line')
      .attr('x1', -15).attr('y1', 0)
      .attr('x2', 15).attr('y2', 0)
      .attr('stroke', 'var(--border-color)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,3')
      .style('pointer-events', 'none')

    // Ring icon centered on union line
    spouseNodes.append('text')
      .attr('x', 0).attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.8rem')
      .text('💍')
      .style('pointer-events', 'none')


    // ── Union/Descent Details at bottom ───────────────────────────────────
    // Children count indicator
    nodeEnter.append('text')
      .attr('x', 0).attr('y', NODE_H / 2 - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.6rem').attr('fill', 'var(--text-muted)')
      .text((d: D3Node) => {
        const count = (d.children?.length || 0) + ((d as any)._children?.length || 0)
        return count > 0 ? `▼ ${count} children` : ''
      })
      .style('pointer-events', 'none')

    // Merge + animate
    const nodeUpdate = nodeEnter.merge(node as any)
    nodeUpdate.transition(transition)
      .attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`)

    node.exit().transition(transition)
      .attr('transform', `translate(${source.x},${source.y})`)
      .remove()

    // ── Links ─────────────────────────────────────────────────────────────
    const link = g.selectAll('path.tree-link')
      .data(links, (d: any) => d.target.data.id) as any

    const diagonal = d3.linkVertical<any, any>()
      .x((d: any) => d.x).y((d: any) => d.y)

    link.enter().append('path')
      .attr('class', 'tree-link')
      .attr('d', () => {
        const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y }
        return diagonal({ source: o, target: o })
      })
      .merge(link as any)
      .transition(transition)
      .attr('d', diagonal)

    link.exit().transition(transition)
      .attr('d', () => {
        const o = { x: source.x, y: source.y }
        return diagonal({ source: o, target: o })
      })
      .remove()

    // Save positions for transitions
    nodes.forEach((d: any) => { d.x0 = d.x; d.y0 = d.y })
  }, [])

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return

    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)
    g.selectAll('*').remove()

    const w = svgRef.current.clientWidth || 900

    // Zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()))
    svg.call(zoom)

    // Center
    svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, 80).scale(0.9))

    // Layout (space sized up to support couple width side-by-side)
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([2 * NODE_W + 80, NODE_H + 60])

    const root = d3.hierarchy(treeData) as D3Node
    treeLayout(root)

    ;(root as any).x0 = 0
    ;(root as any).y0 = 0

    update(root, root, treeLayout, svg, g)
  }, [treeData, update])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="male-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A7E1" />
            <stop offset="100%" stopColor="#003459" />
          </linearGradient>
          <linearGradient id="female-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e18ec4" />
            <stop offset="100%" stopColor="#b33a7e" />
          </linearGradient>
          <linearGradient id="unknown-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#007EA7" />
            <stop offset="100%" stopColor="#00171F" />
          </linearGradient>
          <clipPath id="avatar-clip-local">
            <rect x="-24" y="-24" width="48" height="48" rx="8" ry="8" />
          </clipPath>
        </defs>
        <g ref={gRef} />
      </svg>

      {selectedId && (
        <ProfileCard
          personId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

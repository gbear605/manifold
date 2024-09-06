import clsx from 'clsx'
import { ChartAnnotation } from 'common/supabase/chart-annotations'
import { Axis } from 'd3-axis'
import { ScaleTime } from 'd3-scale'
import { pointer } from 'd3-selection'
import React, { ReactNode, useEffect, useId } from 'react'
import {
  AnnotationMarker,
  PointerMode,
  TooltipContainer,
  XAxis,
  YAxis,
  ZOOM_DRAG_THRESHOLD,
  ZoomParams,
  getTooltipPosition,
  useInitZoomBehavior,
} from './helpers'

export const ManaSpiceChart = <X, TT extends { x: number; y: number }>(props: {
  children: ReactNode
  w: number
  h: number
  xAxis: Axis<X>
  yAxis: Axis<number>
  ttParams?: TT | undefined
  zoomParams?: ZoomParams
  onMouseOver?: (mouseX: number, mouseY: number) => void
  onMouseLeave?: () => void
  Tooltip?: (props: TT) => ReactNode
  noGridlines?: boolean
  className?: string
  // Chart annotation props
  pointerMode?: PointerMode
  onClick?: (x: number, y: number) => void
  xScale?: ScaleTime<number, number>
  yAtTime?: (time: number, answerId?: string | null) => number
  y0?: number
  onHoverAnnotation?: (id: number | null) => void
  hoveredAnnotation?: number | null
  chartAnnotations?: ChartAnnotation[]
  hideXAxis?: boolean
}) => {
  const {
    children,
    w,
    h,
    xAxis,
    yAxis,
    ttParams,
    zoomParams,
    onMouseOver,
    onMouseLeave,
    Tooltip,
    noGridlines,
    className,
    pointerMode = 'zoom',
    onClick,
    xScale,
    yAtTime,
    chartAnnotations,
    y0,
    onHoverAnnotation,
    hoveredAnnotation,
    hideXAxis,
  } = props

  const showAnnotations = xScale && yAtTime && y0 !== undefined
  const onPointerMove = (ev: React.PointerEvent) => {
    if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') {
      const [x, y] = pointer(ev)
      onMouseOver?.(x, y)
    }
  }

  const { onPointerUp, selectStart, selectEnd } = useInitZoomBehavior({
    zoomParams,
    w,
    h,
    pointerMode,
    onClick,
  })

  useEffect(() => {
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerUp])

  const onPointerLeave = () => {
    onMouseLeave?.()
    onHoverAnnotation?.(null)
  }

  const id = useId()

  if (w <= 0 || h <= 0) {
    // i.e. chart is smaller than margin
    return null
  }

  return (
    <div
      className={clsx(
        className,
        'relative select-none',
        pointerMode === 'zoom'
          ? 'cursor-crosshair'
          : pointerMode === 'examine'
          ? 'cursor-pointer'
          : 'cursor-copy'
      )}
      onPointerEnter={onPointerMove}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {ttParams && Tooltip && (
        <TooltipContainer
          calculatePos={(ttw, tth) =>
            getTooltipPosition(ttParams.x, ttParams.y, w, h, ttw, tth)
          }
        >
          {Tooltip(ttParams)}
        </TooltipContainer>
      )}
      {selectStart != undefined && selectEnd != undefined && (
        // swipeover
        <div
          className={clsx(
            selectEnd - selectStart > ZOOM_DRAG_THRESHOLD
              ? 'bg-primary-400/40'
              : 'bg-canvas-100/40',
            'absolute -z-10 transition-colors'
          )}
          style={{
            left: selectStart,
            right: w - selectEnd,
            top: 0,
            bottom: 0,
          }}
        />
      )}
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        overflow="visible"
        ref={zoomParams?.svgRef}
      >
        <defs>
          <filter id={`${id}-blur`}>
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <mask id={`${id}-mask`}>
            <rect
              x={-8}
              y={-8}
              width={w + 16}
              height={h + 16}
              fill="white"
              filter={`url(#${id}-blur)`}
            />
          </mask>
          <clipPath id={`${id}-clip`}>
            <rect x={-32} y={-32} width={w + 64} height={h + 64} />
          </clipPath>
        </defs>

        <g>
          {!hideXAxis && <XAxis axis={xAxis} w={w} h={h} />}
          <YAxis
            axis={yAxis}
            w={w}
            noGridlines={noGridlines}
            iconSVG={ManaSvg}
          />
          {/* clip to stop pointer events outside of graph, and mask for the blur to indicate zoom */}
          <g clipPath={`url(#${id}-clip)`} mask={`url(#${id}-mask)`}>
            {children}
            {/* We can't just change z-index, we have to change rendering order*/}
            {showAnnotations &&
              chartAnnotations
                ?.filter((a) => a.id !== hoveredAnnotation)
                .map((a) => (
                  <AnnotationMarker
                    key={a.id}
                    x={xScale(a.event_time)}
                    y0={y0}
                    y1={yAtTime(a.event_time, a.answer_id)}
                    id={a.id}
                    onHover={(id) => onHoverAnnotation?.(id)}
                    onLeave={() => onHoverAnnotation?.(null)}
                    isHovered={hoveredAnnotation === a.id}
                  />
                ))}
            {showAnnotations &&
              chartAnnotations
                ?.filter((a) => a.id === hoveredAnnotation)
                .map((a) => (
                  <AnnotationMarker
                    key={a.id}
                    x={xScale(a.event_time)}
                    y0={y0}
                    y1={yAtTime(a.event_time, a.answer_id)}
                    id={a.id}
                    onHover={(id) => onHoverAnnotation?.(id)}
                    onLeave={() => onHoverAnnotation?.(null)}
                    isHovered={hoveredAnnotation === a.id}
                  />
                ))}
          </g>
        </g>
      </svg>
    </div>
  )
}

export const ManaSvg = `<?xml version="1.0" encoding="UTF-8"?><svg
  id="Layer_3"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1500 1500"
>
  <defs>
    <style>
      .cls-1 {
        fill: none;
      }
      .cls-2 {
        fill: #a88bfa;
      }
      .cls-3 {
        fill: #a5b4fc;
      }
      .cls-4 {
        fill: #c5b5fd;
      }
      .cls-5 {
        fill: #6d29d9;
      }
      .cls-6 {
        fill: #4c1d95;
      }
      .cls-7 {
        fill: #8b5cf6;
      }
    </style>
  </defs>
  <path
    class="cls-3"
    d="M1243.52,750.2c0,296.35-196.45,542.79-455.4,593.54-32.1,6.3-65.17,9.59-98.95,9.59-306.16,0-554.35-270.04-554.35-603.13,0-306.62,210.28-559.8,482.51-598.12,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.35,270.03,554.35,603.14Z"
  />
  <path
    class="cls-7"
    d="M1463.44,991.35c-92.4,295.59-349.68,508.26-652.62,508.26l-116.75.37c19.54-.15,38.89-1.18,58.02-3.06,275.37-27.12,504.01-230.47,589.83-505.57h121.53Z"
  />
  <path
    class="cls-7"
    d="M1491.62,866.85c-2.35,16.38-5.2,32.57-8.52,48.59h-121.56c3.31-16,6.15-32.21,8.5-48.59h121.58Z"
  />
  <path
    class="cls-7"
    d="M1498.15,694.77h-121.67C1351.83,327.68,1084.25,33.97,747.91,3.08c-19.37-1.77-38.95-2.68-58.74-2.68h144.2c353.3,12.36,639.42,314.02,664.78,694.38Z"
  />
  <path
    class="cls-3"
    d="M689.17,147.06c-24.34,0-48.32,1.71-71.84,5.02-258.85,50.83-455.23,297.23-455.23,593.52,0,333.11,248.2,603.14,554.35,603.14,24.28,0,48.21-1.7,71.67-5,258.96-50.75,455.4-297.19,455.4-593.54,0-333.1-248.19-603.14-554.35-603.14Z"
  />
  <path
    class="cls-4"
    d="M1376.48,694.77C1351.83,327.68,1084.25,33.97,747.91,3.08c-19.37-1.77-38.95-2.68-58.74-2.68C308.55.39,0,336.09,0,750.2s308.55,749.8,689.17,749.8l4.9-.02c19.54-.15,38.89-1.18,58.02-3.06,275.37-27.12,504.01-230.47,589.83-505.57,7.73-24.75,14.3-50.08,19.64-75.92,3.31-16,6.15-32.21,8.5-48.59,5.46-38.01,8.3-76.97,8.3-116.65,0-18.64-.62-37.13-1.86-55.43ZM788.12,1343.75c-32.1,6.3-65.17,9.59-98.95,9.59-306.16,0-554.35-270.04-554.35-603.13,0-306.62,210.28-559.8,482.51-598.12,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.35,270.03,554.35,603.14,0,296.35-196.45,542.79-455.4,593.54Z"
  />
  <path
    class="cls-6"
    d="M788.12,1343.75c-32.1,6.3-65.17,9.59-98.95,9.59-306.16,0-554.35-270.04-554.35-603.13,0-306.62,210.28-559.8,482.51-598.12-258.85,50.83-455.23,297.23-455.23,593.52,0,333.11,248.2,603.14,554.35,603.14,24.28,0,48.21-1.7,71.67-5Z"
  />
  <path
    class="cls-5"
    d="M1243.52,750.2c0,296.35-196.45,542.79-455.4,593.54-23.46,3.3-47.39,5-71.67,5-306.15,0-554.35-270.03-554.35-603.14,0-296.29,196.38-542.69,455.23-593.52,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.35,270.03,554.35,603.14Z"
  />
  <polygon
    class="cls-6"
    points="1056.52 375.75 1056.52 1146.76 939.09 1146.76 939.09 578.56 708.26 948.5 478.46 581.7 478.46 1146.76 361.02 1146.76 361.02 375.75 486.55 375.75 709.06 732.79 929.98 375.75 1056.52 375.75"
  />
  <rect
    class="cls-6"
    x="675.18"
    y="442.59"
    width="67.18"
    height="869.97"
    transform="translate(-168.85 1586.29) rotate(-90)"
  />
  <rect
    class="cls-6"
    x="675.18"
    y="584.39"
    width="67.18"
    height="869.97"
    transform="translate(-310.65 1728.08) rotate(-90)"
  />
  <polygon
    class="cls-4"
    points="1036.92 364.69 1036.92 1135.7 919.48 1135.7 919.48 567.5 688.65 937.44 458.86 570.64 458.86 1135.7 341.42 1135.7 341.42 364.69 466.95 364.69 689.46 721.73 910.37 364.69 1036.92 364.69"
  />
  <rect
    class="cls-4"
    x="655.58"
    y="431.53"
    width="67.18"
    height="869.97"
    transform="translate(-177.39 1555.63) rotate(-90)"
  />
  <rect
    class="cls-4"
    x="655.58"
    y="573.33"
    width="67.18"
    height="869.97"
    transform="translate(-319.19 1697.42) rotate(-90)"
  />
  <line class="cls-1" x1="689.17" y1="1500" x2="694.07" y2="1499.98" />
  <path
    class="cls-2"
    d="M1499.98,749.81c0,39.82-2.86,78.91-8.36,117.04h-121.58c5.46-38.01,8.3-76.97,8.3-116.65,0-18.64-.62-37.13-1.86-55.43h121.67c1.22,18.17,1.83,36.53,1.83,55.03Z"
  />
  <path
    class="cls-2"
    d="M1483.11,915.43c-5.35,25.83-11.93,51.17-19.67,75.92h-121.53c7.73-24.75,14.3-50.08,19.64-75.92h121.56Z"
  />
</svg>
`

export const SpiceSvg = `<?xml version="1.0" encoding="UTF-8"?><svg
  id="Layer_2"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1500 1500"
>
  <defs>
    <style>
      .cls-1 {
        fill: #fdd34e;
      }
      .cls-1,
      .cls-2,
      .cls-3,
      .cls-4,
      .cls-5 {
        stroke-width: 0px;
      }
      .cls-2 {
        fill: none;
      }
      .cls-3 {
        fill: #a5b4fc;
      }
      .cls-4 {
        fill: #d97708;
      }
      .cls-5 {
        fill: #b45309;
      }
    </style>
  </defs>
  <path
    class="cls-3"
    d="M1243.52,750.2c0,296.35-196.45,542.79-455.4,593.54-32.1,6.3-65.17,9.59-98.95,9.59-306.16,0-554.35-270.04-554.35-603.13,0-306.62,210.28-559.8,482.51-598.12,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.35,270.03,554.35,603.14Z"
  />
  <path
    class="cls-5"
    d="M1463.44,991.35c-92.4,295.59-349.68,508.26-652.62,508.26l-116.75.37c19.54-.15,38.89-1.18,58.02-3.06,275.37-27.12,504.01-230.47,589.83-505.57h121.53Z"
  />
  <path
    class="cls-5"
    d="M1491.62,866.85c-2.35,16.38-5.2,32.57-8.52,48.59h-121.56c3.31-16,6.15-32.21,8.5-48.59h121.58Z"
  />
  <path
    class="cls-5"
    d="M1498.15,694.77h-121.67C1351.83,327.68,1084.25,33.97,747.91,3.08c-19.37-1.77-38.95-2.68-58.74-2.68h144.2c353.3,12.36,639.42,314.02,664.78,694.38Z"
  />
  <path
    class="cls-3"
    d="M833.32.39h-44.99c7.47-.26,14.97-.39,22.49-.39s15.03.13,22.5.39Z"
  />
  <path
    class="cls-3"
    d="M689.17,147.06c-24.34,0-48.32,1.71-71.84,5.02-258.85,50.83-455.23,297.23-455.23,593.52,0,333.11,248.2,603.14,554.35,603.14,24.28,0,48.21-1.7,71.67-5,258.96-50.75,455.4-297.19,455.4-593.54,0-333.1-248.19-603.14-554.35-603.14Z"
  />
  <path
    class="cls-1"
    d="M1376.48,694.77C1351.83,327.68,1084.25,33.97,747.91,3.08c-19.37-1.77-38.95-2.68-58.74-2.68C308.55.39,0,336.09,0,750.2s308.55,749.8,689.17,749.8l4.9-.02c19.54-.15,38.89-1.18,58.02-3.06,275.37-27.12,504.01-230.47,589.83-505.57,7.73-24.75,14.3-50.08,19.64-75.92,3.31-16,6.15-32.21,8.5-48.59,5.46-38.01,8.3-76.97,8.3-116.65,0-18.64-.62-37.13-1.86-55.43ZM788.12,1343.75c-32.1,6.3-65.17,9.59-98.95,9.59-306.16,0-554.35-270.04-554.35-603.13,0-306.62,210.28-559.8,482.51-598.12,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.35,270.03,554.35,603.14,0,296.35-196.45,542.79-455.4,593.54Z"
  />
  <path
    class="cls-5"
    d="M788.12,1343.75c-32.1,6.3-65.17,9.59-98.95,9.59-306.16,0-554.35-270.04-554.35-603.13,0-306.62,210.28-559.8,482.51-598.12-258.85,50.83-455.23,297.23-455.23,593.52,0,333.11,248.2,603.14,554.35,603.14,24.28,0,48.21-1.7,71.67-5Z"
  />
  <path
    class="cls-4"
    d="M1243.52,750.2c0,296.35-196.45,542.79-455.4,593.54-23.46,3.3-47.39,5-71.67,5-306.15,0-554.35-270.03-554.35-603.14,0-296.29,196.38-542.69,455.23-593.52,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.35,270.03,554.35,603.14Z"
  />
  <line class="cls-2" x1="689.17" y1="1500" x2="694.07" y2="1499.98" />
  <path
    class="cls-4"
    d="M1499.98,749.81c0,39.82-2.86,78.91-8.36,117.04h-121.58c5.46-38.01,8.3-76.97,8.3-116.65,0-18.64-.62-37.13-1.86-55.43h121.67c1.22,18.17,1.83,36.53,1.83,55.03Z"
  />
  <path
    class="cls-4"
    d="M1483.11,915.43c-5.35,25.83-11.93,51.17-19.67,75.92h-121.53c7.73-24.75,14.3-50.08,19.64-75.92h121.56Z"
  />
  <path
    class="cls-5"
    d="M467.45,1144.59V373.4h117.99v771.19h-117.99ZM574.26,877.98v-117.88h157.66c33.9,0,61.69-12.48,83.39-37.46,21.7-24.95,32.56-57.65,32.56-98.05,0-26.43-5.6-49.74-16.79-69.95-11.19-20.2-26.61-36.18-46.27-47.94-19.69-11.73-42.39-17.24-68.15-16.51h-142.4v-116.79l144.43-1.09c48.82,0,91.88,10.83,129.18,32.5,37.28,21.67,66.44,51.42,87.46,89.24,21.01,37.83,31.54,81.71,31.54,131.65s-9.84,92.73-29.49,130.55c-19.67,37.83-47.14,67.59-82.39,89.24-35.26,21.67-75.61,32.5-121.04,32.5h-159.68Z"
  />
  <path
    class="cls-1"
    d="M447.76,1133.53V362.33h117.99v771.19h-117.99ZM554.56,866.92v-117.88h157.66c33.9,0,61.69-12.48,83.39-37.46,21.7-24.95,32.56-57.65,32.56-98.05,0-26.43-5.6-49.74-16.79-69.95-11.19-20.2-26.61-36.18-46.27-47.94-19.69-11.73-42.39-17.24-68.15-16.51h-142.4v-116.79l144.43-1.09c48.82,0,91.88,10.83,129.18,32.5,37.28,21.67,66.44,51.42,87.46,89.24,21.01,37.83,31.54,81.71,31.54,131.65s-9.84,92.73-29.49,130.55c-19.67,37.83-47.14,67.59-82.39,89.24-35.26,21.67-75.61,32.5-121.04,32.5h-159.68Z"
  />
</svg>

`

export const SweepiesSvg = `
<?xml version="1.0" encoding="UTF-8"?><svg
  id="Layer_2"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1500 1500"
>
  <defs>
    <style>
      .cls-1 {
        fill: #b45309;
      }
      .cls-2 {
        fill: #fdd34e;
      }
      .cls-3 {
        fill: #d97708;
      }
    </style>
  </defs>
  <path
    class="cls-1"
    d="M1463.46,991.16c-92.4,295.59-349.68,508.26-652.62,508.26l-116.75.37c19.54-.15,38.89-1.18,58.02-3.06,275.37-27.12,504.01-230.47,589.83-505.57h121.53Z"
  />
  <path
    class="cls-1"
    d="M1491.64,866.66c-2.35,16.38-5.2,32.57-8.52,48.59h-121.56c3.31-16,6.15-32.21,8.5-48.59h121.58Z"
  />
  <path
    class="cls-1"
    d="M1498.17,694.59h-121.67C1351.85,327.49,1084.27,33.78,747.93,2.89c-19.37-1.77-38.95-2.68-58.74-2.68h144.2c353.3,12.36,639.42,314.02,664.78,694.38Z"
  />
  <path
    class="cls-3"
    d="M1500,749.62c0,39.82-2.86,78.91-8.36,117.04h-121.58c5.46-38.01,8.3-76.97,8.3-116.65,0-18.64-.62-37.13-1.86-55.43h121.67c1.22,18.17,1.83,36.53,1.83,55.03Z"
  />
  <path
    class="cls-3"
    d="M1483.13,915.25c-5.35,25.83-11.93,51.17-19.67,75.92h-121.53c7.73-24.75,14.3-50.08,19.64-75.92h121.56Z"
  />
  <path
    class="cls-2"
    d="M689.18,0C308.55,0,0,335.78,0,750s308.55,750,689.18,750,689.18-335.78,689.18-750S1069.81,0,689.18,0ZM689.18,1353.29c-306.17,0-554.37-270.11-554.37-603.29,0-306.7,210.29-559.94,482.52-598.28-258.86,50.85-455.24,297.31-455.24,593.68,0,333.19,248.2,603.3,554.37,603.3,24.28,0,48.21-1.7,71.67-5-32.11,6.3-65.17,9.59-98.94,9.59Z"
  />
  <path
    class="cls-1"
    d="M788.13,1343.71c-32.11,6.3-65.17,9.59-98.94,9.59-306.17,0-554.37-270.11-554.37-603.29,0-306.7,210.29-559.94,482.52-598.28-258.86,50.85-455.24,297.31-455.24,593.68,0,333.19,248.2,603.3,554.37,603.3,24.28,0,48.21-1.7,71.67-5Z"
  />
  <path
    class="cls-3"
    d="M1243.54,750c0,296.43-196.46,542.94-455.41,593.7-23.45,3.3-47.38,5-71.67,5-306.16,0-554.37-270.11-554.37-603.3,0-296.37,196.38-542.83,455.24-593.68,23.52-3.31,47.5-5.02,71.84-5.02,306.16,0,554.36,270.11,554.36,603.3Z"
  />
  <path
    class="cls-1"
    d="M718.7,1222.51c-42.76,0-81.83-5.51-117.18-16.49-35.36-11-66.45-26.22-93.27-45.68-26.81-19.45-48.96-41.23-66.45-65.34-17.49-24.11-29.73-49.27-36.71-75.49l132.91-44.4c10.09,31.31,29.92,58.79,59.45,82.47,29.53,23.69,66.06,35.95,109.59,36.8,50.51,0,90.55-11.41,120.08-34.25,29.53-22.84,44.3-52.87,44.3-90.09,0-33.84-12.44-61.53-37.32-83.11-24.87-21.56-58.29-38.27-100.25-50.12l-100.27-27.92c-38.1-10.98-72.48-27.05-103.18-48.19-30.7-21.14-54.79-47.8-72.28-79.94-17.49-32.14-26.22-70.2-26.22-114.19,0-82.88,24.86-147.39,74.6-193.49,49.74-46.1,120.86-69.15,213.36-69.15,52.07,0,97.72,8.68,136.98,26.01,39.24,17.35,71.69,41.03,97.34,71.05,25.65,30.03,44.7,64.07,57.14,102.14l-130.58,45.67c-11.66-33.82-31.87-61.74-60.63-83.73s-64.51-32.99-107.25-32.99-79.09,11.43-104.34,34.25c-25.27,22.84-37.89,54.57-37.89,95.16,0,32.99,9.9,58.57,29.73,76.75,19.81,18.18,46.82,31.93,81.03,41.23l100.27,26.65c73.06,19.46,129.79,52.87,170.21,100.23,40.42,47.36,60.63,99.8,60.63,157.31,0,50.76-11.28,95.59-33.82,134.49-22.53,38.91-55.76,69.36-99.68,91.35-43.92,21.99-97.34,32.99-160.29,32.99Z"
  />
  <path
    class="cls-2"
    d="M700.11,1206.5c-42.76,0-81.83-5.51-117.18-16.49-35.36-11-66.45-26.22-93.27-45.68-26.81-19.45-48.96-41.23-66.45-65.34-17.49-24.11-29.73-49.27-36.71-75.49l132.91-44.4c10.09,31.31,29.92,58.79,59.45,82.47,29.53,23.69,66.06,35.95,109.59,36.8,50.51,0,90.55-11.41,120.08-34.25,29.53-22.84,44.3-52.87,44.3-90.09,0-33.84-12.44-61.53-37.32-83.11-24.87-21.56-58.29-38.27-100.25-50.12l-100.27-27.92c-38.1-10.98-72.48-27.05-103.18-48.19-30.7-21.14-54.79-47.8-72.28-79.94-17.49-32.14-26.22-70.2-26.22-114.19,0-82.88,24.86-147.39,74.6-193.49,49.74-46.1,120.86-69.15,213.36-69.15,52.07,0,97.72,8.68,136.98,26.01,39.24,17.35,71.69,41.03,97.34,71.05,25.65,30.03,44.7,64.07,57.14,102.14l-130.58,45.67c-11.66-33.82-31.87-61.74-60.63-83.73-28.75-21.99-64.51-32.99-107.25-32.99s-79.09,11.43-104.34,34.25c-25.27,22.84-37.89,54.57-37.89,95.16,0,32.99,9.9,58.57,29.73,76.75,19.81,18.18,46.82,31.93,81.03,41.23l100.27,26.65c73.06,19.46,129.79,52.87,170.21,100.23,40.42,47.36,60.63,99.8,60.63,157.31,0,50.76-11.28,95.59-33.82,134.49-22.53,38.91-55.76,69.36-99.68,91.35s-97.34,32.99-160.29,32.99Z"
  />
</svg>

`

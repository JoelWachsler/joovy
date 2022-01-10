import { defer, from, map, mergeMap, Observable } from 'rxjs'
import ytdl from 'ytdl-core'
import ytsr from 'ytsr'
import { YtSearchResult } from '../YtSearchResult'

export const ytSearchFactoryImpl = (query: string): Observable<YtSearchResult> => {
  return defer(() => {
    const normalLink = /(?:https)?:\/\/www.youtube.com\/watch\?.*?v=(\w+).*?/
    const shortenedLink = /(?:https)?:\/\/youtu.be\/(\w+).*?/

    const videoIdMatch = query.match(normalLink) ?? query.match(shortenedLink)

    if (videoIdMatch) {
      // yt-search doesn't work that well with actual url:s, let's use
      // ytdl-core for this instead.
      // Add &bpctr=9999999999 to prevent age restriction errors.
      return from(ytdl.getInfo(`${query}&bpctr=9999999999`)).pipe(
        map(r => {
          const details = r.videoDetails

          const toMinutesAndSeconds = (seconds: number) => {
            return `${Math.floor(seconds / 60)}:${seconds % 60}`
          }

          return {
            url: details.video_url,
            title: details.title,
            timestamp: toMinutesAndSeconds(Number(details.lengthSeconds)),
          }
        }),
      )
    } else {
      return getVideoFilter(query).pipe(
        mergeMap(filter => {
          const filterUrl = filter.url
          if (!filterUrl) {
            throw Error('Filter url not found...')
          }

          return from(ytsr(filterUrl, { limit: 1, gl: 'SE' }))
        }),
        map(res => res.items),
        map(items => items.filter(item => item.type === 'video')),
        map(items => {
          if (items.length < 1) {
            throw Error(`No results found for: ${query}`)
          }

          const [result] = items
          return result
        }),
        mergeMap(result => result.type === 'video' ? [result] : []),
        map(result => {
          const timestamp = result.duration
          if (!timestamp) {
            throw Error('Failed to parse video duration...')
          }

          return {
            url: result.url,
            title: result.title,
            timestamp,
          }
        }),
      )
    }
  })
}

const getVideoFilter = (query: string): Observable<ytsr.Filter> => {
  return defer(() => from(ytsr.getFilters(query))).pipe(
    map(filter => {
      const f = filter.get('Type')?.get('Video')
      if (!f) {
        throw Error('Filter not found...')
      }

      return f
    }),
  )
}

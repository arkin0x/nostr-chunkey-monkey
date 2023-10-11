import NDK, { NDKEvent } from '@nostr-dev-kit/ndk'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from "@noble/hashes/utils"

// kinds
export const BLOB = 5391
export const HTML = 5392
export const CSS = 5393
export const JS = 5394

/**
 * Evidently 128kb is the default limit on many relays for event size, so we use 100kb just to be safe.
 * See discussion at https://t.me/nostr_protocol/92664
 */
const CHUNK_SIZE = 100 * 1024 // 100KB

export type ChunkeyMonkeyPublishOptions = {
  ndk: NDK
  file: File
  tags: string[][]
  attach: string
  description: string
  chunkSizeBytes: number
}

// use this like event.tags.find(getTag('e'))[1] to get the value of the e tag
type FindTag = (tag: string[]) => boolean;
const getTag = (key: string): FindTag => {
  return (tag): boolean => {
    return tag && Array.isArray(tag) && tag[0] === key
  }
}
// this function requires the key and value to match
const getTagValue = (key: string, value: string): FindTag => {
  return (tag): boolean => {
    return tag && Array.isArray(tag) && tag[0] === key && tag[1] === value
  }
}

/**
 * Publish a file into chunks via monkey
 * @param param0 ndk - your ndk instance
 * @param param1 file - the file to split into chunks
 * @param param2 OPTIONAL tags - customize the tags for the chunk events
 * @param param3 OPTIONAL attach - specify an event id to attach this event to. This makes it easy to query for {"#e"->attach, kind: 5391} and 
 * @param param4 description - an alt description of the file
 * @param param5 chunkSize - custom chunk size in bytes. Default is 100kb
 */
export async function publish<ChunkeyMonkeyPublishOptions>({ndk, file, tags, attach, description, chunkSizeBytes}): Promise<NDKEvent[]> {
  const published: NDKEvent[] = []
  try {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async () => {
      if (!reader.result) {
        throw new Error('Could not read file.')
      }
      // split the data url into base64 and mime type
      const [mime, base64] = (reader.result as string).split(',')
      const chunks = chunkPayload(base64, chunkSizeBytes)
      const hash = getFileHash(base64)

      chunks.forEach( async (chunk, index) => {
        const ndkEvent = new NDKEvent(ndk)
        ndkEvent.kind = BLOB
        ndkEvent.content = chunk 
        if (attach) {
          ndkEvent.tags.push(['e', attach, ndk.explicitRelayUrls[0], "root" ])
        }
        if (tags) {
          ndkEvent.tags.push(...tags)
        }
        ndkEvent.tags.push(['m', mime])
        if (description) {
          ndkEvent.tags.push(['alt', description])
        }
        ndkEvent.tags.push(['index', index.toString()])
        ndkEvent.tags.push(['x', hash])
        await ndkEvent.publish()
        published.push(ndkEvent)
      })
    }
  } catch (e) {
    console.error(e)
  }
  return published
}

const getFileHash = (base64: string): string => {
  // get the hash of the file; this serves as an identifier for the file
  const plaintext = atob(base64)
  // console.log('plaintext',plaintext) // the file is intact!
  const binarytext = (new TextEncoder()).encode(plaintext)
  const hash = bytesToHex(sha256(binarytext))
  return hash
}

// Split a file into chunks 
const chunkPayload = (base64:string, customChunkSize?: number): string[] => {
  let chunkSize = CHUNK_SIZE
  if (customChunkSize) chunkSize = customChunkSize

  const chunks: string[] = []
  let offset = 0

  while(offset < base64.length) {
    const chunk = base64.slice(offset, offset + chunkSize)
    chunks.push(chunk)
    offset += chunkSize
  }

  return chunks
}

/**
 * reassemble assets from chunks
 * @param param0 events - The returned Set from an NDK .fetchEvents() call for a group of chunks. You can pass multiple groups for different files into this function and it will return each file as a separate entry in the output object.
 * Returns an object of {"mime:hash" -> decoded plaintext file string}. The mime is provided for convenience to identify the kind of file.
 * 
 */
export const reassemble = (events: Set<NDKEvent> | NDKEvent[]): { [unique: string]: string } => {
  // Group events by hash and mime
  const groups: { [unique: string]: NDKEvent[] } = {}
  for (const event of events) {
    if (!event) continue
    const hash = event.tags.find(getTag('x'))?.[1]
    const mime = event.tags.find(getTag('m'))?.[1]
    const unique = `${mime}:${hash}`
    const group = groups[unique] ?? []
    group.push(event)
    groups[unique] = group
  }

  // Sort events within each group by index
  for (const group of Object.values(groups)) {
    group.sort((a, b) => parseInt(a.tags.find(getTag('index'))![1]) - parseInt(b.tags.find(getTag('index'))![1]))
  }

  // Stitch chunks together within each group
  const result: { [unique: string]: string } = {}
  for (const [unique, group] of Object.entries(groups)) {
    const chunks = group.map((event) => atob(event.content))
    result[unique] = chunks.join('')
  }

  return result
}

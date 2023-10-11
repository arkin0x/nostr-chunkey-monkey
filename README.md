# Chunkey Monkey

![Chunkey Monkey](chunkeymonkey.png)

Publish large files to nostr as chunks and reassemble them with ease!

> [!IMPORTANT]
> This package requires the usage of [NDK](https://github.com/nostr-dev-kit/ndk#installation)

## Install

``` bash
$ yarn add nostr-chunkey-monkey
```

## Usage

``` javascript
import { publish, reassemble } from 'nostr-chunkey-monkey'

// get the file from the input[type=file] element
const files = uploadElement.files
// if the input has the multiple attribute, it can handle multiple files at once

// optional custom tags
const customTags = [
  ["whatever", "you want"],
  ["do it", "like this"],
  ["monkey", "🐒🍌"],
]

// Optional hex event id to attach the chunks to.
// This makes the attached event a magnet for querying chunks when the chunked file hash isn't known: Filter { kinds: 5391, #e <attached> }
const attachToEvent = "0fbc395a..." 

const allChunks = []

for (const file of files) {
  const publishedFileChunks = await publish({ndk, file, tags: customTags, attach: attachToEvent })

  // Display the SHA256 hash of the file. This will be the same for every chunk, so you can use it as the identifier of the group of chunks.
  // You can filter a relay query for the x tag to grab all the chunks.
  let hash = publishedFileChunks[0].tags.find( t => t[0] === 'x')[1] 
  console.log(hash)

  allChunks.push(...publishedFileChunks)

}

// reassemble the files, even multiple different files at a time, by passing chunk events into reassemble()

const reassembledFiles = reassemble(allChunks)

console.log(reassembledFiles) // {"<mimetype>:<hash>": "plaintext file contents", ...}

```

## Todo

- [ ] modify index tag to support 3rd element indicating how many chunks the file has
- [ ] add error if not all chunks are found for a file

## PR's welcome!

This is my first package ever so it probably sucks

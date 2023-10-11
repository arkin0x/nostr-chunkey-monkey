# Chunkey Monkey

![Chunkey Monkey](chunkeymonkey.png)

Publish large files to nostr as chunks and reassemble them with ease!

## Install

``` bash
$ yarn add nostr-chunkey-monkey
```

## Usage

``` javascript
import { publish } from 'nostr-chunkey-monkey'

// get the file from the input[type=file] element
const files = uploadElement.files
// if the input has the multiple attribute, it can handle multiple files at once

// optional custom tags
const customTags = [
  ["whatever", "you want"]
  ["do it", "like this"]
  ["monkey", "🐒🍌"]
]

// optional hex event id to attach the chunks to
const attachToEvent = "0fbc395a..." 

const allChunks = []

for (const file of files) {
  const publishedFileChunks = await publish({ndk, file, tags: customTags, attach: attachToEvent })

  // display the SHA256 hash of the file. This will be the same for every chunk, so you can use it as the identifier of the group of chunks. You can filter a relay query for the x tag to grab all the chunks.
  let hash = publishedFileChunks[0].tags.find( t => t[0] === 'x')[1] 
  console.log(hash)

  allChunks.push(...publishedFileChunks)

}

// reassemble the files, even multiple at a time:

const reassembledFiles = reassemble(allChunks)

console.log(reassembledFiles) // {"<mimetype>:<hash>": "plaintext file contents", ...}

```
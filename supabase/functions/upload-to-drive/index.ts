import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileName, fileType, fileData, folder } = await req.json()

    const serviceAccount = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT') ?? '{}')

    // Get Google access token
    const jwt = await createJWT(serviceAccount)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })
    const { access_token } = await tokenRes.json()

    // Find or create folder in Drive
    const folderId = await getOrCreateFolder(access_token, folder || 'PropertyFlow Attachments')

    // Upload file
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
    const boundary = 'boundary123'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const metaPart = `${delimiter}Content-Type: application/json\r\n\r\n${metadata}`
    const filePart = `${delimiter}Content-Type: ${fileType}\r\n\r\n`
    const encoder = new TextEncoder()
    const metaBytes = encoder.encode(metaPart)
    const filePartBytes = encoder.encode(filePart)
    const closeBytes = encoder.encode(closeDelimiter)
    const body = new Uint8Array(metaBytes.length + filePartBytes.length + binaryData.length + closeBytes.length)
    body.set(metaBytes, 0)
    body.set(filePartBytes, metaBytes.length)
    body.set(binaryData, metaBytes.length + filePartBytes.length)
    body.set(closeBytes, metaBytes.length + filePartBytes.length + binaryData.length)

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      }
    )

    const file = await uploadRes.json()

    // Make file publicly viewable
    await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    })

    return new Response(
      JSON.stringify({ success: true, url: file.webViewLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getOrCreateFolder(token: string, name: string): Promise<string> {
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const { files } = await search.json()
  if (files?.length > 0) return files[0].id

  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' })
  })
  const folder = await create.json()
  return folder.id
}

async function createJWT(sa: any): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))

  const pemKey = sa.private_key
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signingInput = `${header}.${claim}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `${signingInput}.${sig}`
}
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const authHeader = request.headers.get('Authorization')

  // Proxy to Go backend
  const goBackendUrl = 'http://localhost:8080/api/jobs/extract-keywords'

  try {
    const response = await fetch(goBackendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader ?? '',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.error || 'Go backend error' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to proxy dynamic request to Go backend:', error)
    return NextResponse.json({ error: 'Failed to communicate with Go backend' }, { status: 500 })
  }
}

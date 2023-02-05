import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import Script from 'next/script'
import { useEffect } from 'react'
import { useUser } from 'web/hooks/use-user'
import { auth } from './users'

// declare const google: any

async function handleResponse(response: any) {
  const idToken = response.credential
  const credential = GoogleAuthProvider.credential(idToken)
  try {
    const result = await signInWithCredential(auth, credential)
    console.log(result.user)
  } catch (error) {
    console.error('could not log in via onetap', error)
  }
}

const initGSI = () => {
  ;(window as any).google.accounts.id.initialize({
    client_id:
      '128925704902-bpcbnlp2gt73au3rrjjtnup6cskr89p0.apps.googleusercontent.com',
    context: 'signin',
    callback: handleResponse,
    prompt_parent_id: 'signup-prompt',
    auto_select: true,
    close_on_tap_outside: false,
    itp_support: true,
  })
  ;(window as any).google.accounts.id.prompt()
  console.log('promptinggg')
}

export const GoogleOneTapSetup = () => {
  const user = useUser()

  useEffect(() => {
    if (user === null) {
      setTimeout(() => initGSI(), 1000)
    }
  }, [user])

  return <Script src="https://accounts.google.com/gsi/client" />
}

export const GoogleOneTapLogin = () => {
  return (
    <>
      <div id="signup-prompt" className="h-48 w-full bg-gray-300" />
      {/* <div
        id="g_id_onload"
        data-client_id="128925704902-bpcbnlp2gt73au3rrjjtnup6cskr89p0.apps.googleusercontent.com"
        data-context="signin"
        data-callback="callback"
        data-auto_select="true"
        data-close_on_tap_outside="false"
        data-itp_support="true"
      ></div> */}
    </>
  )
}

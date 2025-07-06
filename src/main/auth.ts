import { BrowserWindow } from 'electron'
import { google } from 'googleapis'
import { findUserByEmail, createUser, createOrUpdateAccount, updateUserLastActive } from './database'
import * as http from 'http'
import * as url from 'url'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.AUTH_GOOGLE_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.AUTH_GOOGLE_SECRET || ''
const REDIRECT_URI = 'http://localhost:3000/auth/callback'

// Debug logging (remove in production)
if (process.env.NODE_ENV === 'development') {
  console.log('Google OAuth Configuration:')
  console.log('CLIENT_ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT SET')
  console.log('CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET')
  console.log('REDIRECT_URI:', REDIRECT_URI)
}

interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture: string
  email_verified: boolean
}

export class AuthService {
  private oauth2Client: any
  private authWindow: BrowserWindow | null = null
  private callbackServer: http.Server | null = null

  constructor() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials are missing!')
      console.error('Please check your .env file and ensure AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set')
      throw new Error('Google OAuth credentials are not configured')
    }

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    )
  }

  async initiateGoogleLogin(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Start the callback server first
      this.startCallbackServer(resolve, reject)

      // Generate the OAuth URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
        prompt: 'consent'
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('Generated OAuth URL:', authUrl)
      }

      // Create a new browser window for authentication
      this.authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Load the Google OAuth URL
      this.authWindow.loadURL(authUrl)

      // Handle window close
      this.authWindow.on('closed', () => {
        this.authWindow = null
        this.stopCallbackServer()
        reject(new Error('Authentication window was closed'))
      })
    })
  }

  private startCallbackServer(resolve: Function, reject: Function) {
    this.callbackServer = http.createServer((req, res) => {
      const reqUrl = url.parse(req.url!, true)

      if (reqUrl.pathname === '/auth/callback') {
        // Send a success response to the browser
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Authentication Successful!</h2>
              <p>You can now close this window and return to CSVGen Pro.</p>
              <script>window.close();</script>
            </body>
          </html>
        `)

        // Handle the callback
        this.handleServerCallback(reqUrl.query, resolve, reject)
      }
    })

    this.callbackServer.listen(3000, 'localhost', () => {
      console.log('OAuth callback server started on http://localhost:3000')
    })

    this.callbackServer.on('error', (error) => {
      console.error('Callback server error:', error)
      reject(new Error(`Failed to start callback server: ${error.message}`))
    })
  }

  private stopCallbackServer() {
    if (this.callbackServer) {
      this.callbackServer.close()
      this.callbackServer = null
      console.log('OAuth callback server stopped')
    }
  }

  private async handleServerCallback(query: any, resolve: Function, reject: Function) {
    try {
      const code = query.code

      if (!code) {
        throw new Error('No authorization code received')
      }

      // Exchange the code for tokens
      const { tokens } = await this.oauth2Client.getToken(code)
      this.oauth2Client.setCredentials(tokens)

      // Get user information
      const userInfo = await this.getUserInfo(tokens.access_token!)

      // Store or update user in database
      const user = await this.handleUserLogin(userInfo, tokens)

      // Close the auth window and stop the server
      if (this.authWindow) {
        this.authWindow.close()
        this.authWindow = null
      }
      this.stopCallbackServer()

      resolve({
        user,
        tokens
      })
    } catch (error) {
      console.error('Authentication error:', error)
      if (this.authWindow) {
        this.authWindow.close()
        this.authWindow = null
      }
      this.stopCallbackServer()
      reject(error)
    }
  }



  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`)

    if (!response.ok) {
      throw new Error('Failed to fetch user information')
    }

    return await response.json()
  }

  private async handleUserLogin(userInfo: GoogleUserInfo, tokens: any) {
    try {
      // Check if user exists
      let user = await findUserByEmail(userInfo.email)

      if (!user) {
        console.log(`Creating new user for email: ${userInfo.email}`)
        // Create new user with metadata
        user = await createUser({
          email: userInfo.email,
          name: userInfo.name,
          image: userInfo.picture
        })
        console.log(`User created successfully with ID: ${user.id}`)
      } else {
        console.log(`Existing user found with ID: ${user.id}`)
      }

      // Create or update the Google account
      await createOrUpdateAccount({
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: userInfo.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        token_type: tokens.token_type,
        scope: tokens.scope,
        id_token: tokens.id_token
      })

      // Update last active (this will now upsert the metadata if it doesn't exist)
      await updateUserLastActive(user.id)

      return user
    } catch (error) {
      console.error('Database error during login:', error)
      console.error('Error details:', error)
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown database error'}`)
    }
  }

  async logout() {
    // Clear tokens
    this.oauth2Client.setCredentials({})

    // Close auth window if open
    if (this.authWindow) {
      this.authWindow.close()
      this.authWindow = null
    }

    // Stop callback server if running
    this.stopCallbackServer()
  }


}

export const authService = new AuthService()

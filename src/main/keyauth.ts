import { Buffer } from "buffer";
import { execSync, exec } from "child_process";
import { verifyKey } from "discord-interactions";
import os from "os";
import fs from "fs";
import crypto from "crypto";


interface KeyAuthOptions {
  name: string;
  ownerid: string;
  version: string;
  hash_to_check?: string;
  url?: string;
  path?: string;
}

interface KeyAuthUserData {
  username: string;
  ip: string;
  hwid: string;
  expires: number;
  createdate: number;
  lastlogin: number;
  subscription: string;
  subscriptions: string;
}

interface KeyAuthAppData {
  numUsers: number;
  numKeys: number;
  app_ver: string;
  customer_panel: string;
  onlineUsers: number;
}

class KeyAuth {
  private name: string;
  private ownerid: string;
  private version: string;
  private hash_to_check?: string;
  private url: string = "https://keyauth.win/api/1.3/";
  private path?: string;
  private public_key: string = "5586b4bc69c7a4b487e4563a4cd96afd39140f919bd31cea7d1c6a1e8439422b";
  private sessionid?: string;
  private initialized: boolean = false;
  public user_data: KeyAuthUserData | null = null;
  public app_data: KeyAuthAppData | null = null;

  constructor(options: KeyAuthOptions) {
    this.name = options.name;
    this.ownerid = options.ownerid;
    this.version = options.version;
    this.hash_to_check = options.hash_to_check;
    this.url = options.url ?? "https://keyauth.win/api/1.3/";
    this.path = options.path;

    if (!this.name || !this.ownerid || !this.version) {
      throw new Error("Name, ownerid, and version are required");
    }
  }

  async init() {
    if (this.sessionid && this.initialized) {
      console.log("Application already initialized");
      return;
    }

    let token: string = "";
    if (this.path) {
      try {
        token = fs.readFileSync(this.path, "utf-8").trim();
      } catch (error) {
        console.error(`Failed to read file at path ${this.path}:`, error);
        await this.sleep(5000);
        process.exit(0);
      }
    }

    const post_data = {
      "type": "init",
      "name": this.name,
      "ownerid": this.ownerid,
      "version": this.version,
      "hash": this.hash_to_check,
      ...this.path && {
        "token": token,
        "thash": crypto.createHash("sha256").update(token).digest("hex"),
      }
    };

    const response = await this.__do_request(post_data) as any;

    if (response === "KeyAuth_Invalid") {
      console.log("This application does not exist");
      await this.sleep(5000);
      process.exit(0);
    }

    if (response["message"] === "invalidver") {
      if (response["download"]) {
        console.log("Your application is outdated.");
        exec(`start ${response["download"]}`, (error: any) => {
          if (error) {
            console.error("Failed to open the download link:", error);
          }
        });
        await this.sleep(5000);
        process.exit(0);
      } else {
        console.log("Your application is outdated and no download link was provided, contact the owner for the latest app version.");
        await this.sleep(5000);
        process.exit(0);
      }
    }

    if (response["success"] === false) {
      console.log(response["message"]);
      await this.sleep(5000);
      process.exit(0);
    }

    this.sessionid = response["sessionid"];
    this.initialized = true;
  }

  async register(username: string, password: string, license: string, hwid?: string) {
    this.checkinit();
    if (!hwid) hwid = this.get_hwid();

    const post_data = {
      "type": "register",
      "name": this.name,
      "ownerid": this.ownerid,
      "sessionid": this.sessionid,
      "username": username,
      "pass": password,
      "key": license,
      "hwid": hwid,
    };

    const response = await this.__do_request(post_data) as any;

    if (response["success"] === true) {
      console.log(response["message"]);
      this.__load_user_data(response["info"]);
    } else {
      throw new Error(response["message"]);
    }
  }

  async login(username: string, password: string, code?: string, hwid?: string) {
    this.checkinit();
    if (!hwid) hwid = this.get_hwid();

    const post_data = {
      "type": "login",
      "name": this.name,
      "ownerid": this.ownerid,
      "sessionid": this.sessionid,
      "username": username,
      "pass": password,
      "hwid": hwid,
      ...code && { "code": code },
    };

    const response = await this.__do_request(post_data) as any;

    if (response["success"] === true) {
      console.log(response["message"]);
      this.__load_user_data(response["info"]);
    } else {
      throw new Error(response["message"]);
    }
  }

  async license(license: string, code?: string, hwid?: string) {
    this.checkinit();
    if (!hwid) hwid = this.get_hwid();

    const post_data = {
      "type": "license",
      "name": this.name,
      "ownerid": this.ownerid,
      "sessionid": this.sessionid,
      "key": license,
      "hwid": hwid,
      ...code && { "code": code },
    };

    const response = await this.__do_request(post_data) as any;

    if (response["success"] === true) {
      console.log(response["message"]);
      this.__load_user_data(response["info"]);
    } else {
      throw new Error(response["message"]);
    }
  }

  async checkinit() {
    if (!this.sessionid && !this.initialized) {
      throw new Error("Application not initialized");
    }
  }

  get_hwid(): string {
    const platform = os.platform();

    if (platform === "win32") {
      // Try multiple methods for Windows HWID generation
      try {
        // Method 1: Try to get machine GUID from registry
        try {
          const output = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8' });
          const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/);
          if (match && match[1]) {
            return match[1].trim();
          }
        } catch (error) {
          console.log("Method 1 failed, trying method 2...");
        }

        // Method 2: Try to get motherboard serial number
        try {
          const output = execSync('wmic baseboard get serialnumber', { encoding: 'utf8' });
          const lines = output.split('\n').filter(line => line.trim() && !line.includes('SerialNumber'));
          if (lines.length > 0 && lines[0].trim()) {
            return lines[0].trim();
          }
        } catch (error) {
          console.log("Method 2 failed, trying method 3...");
        }

        // Method 3: Try to get CPU ID
        try {
          const output = execSync('wmic cpu get processorid', { encoding: 'utf8' });
          const lines = output.split('\n').filter(line => line.trim() && !line.includes('ProcessorId'));
          if (lines.length > 0 && lines[0].trim()) {
            return lines[0].trim();
          }
        } catch (error) {
          console.log("Method 3 failed, trying method 4...");
        }

        // Method 4: Fallback to username + hostname hash
        const username = os.userInfo().username;
        const hostname = os.hostname();
        const fallbackId = crypto.createHash('sha256').update(`${username}-${hostname}`).digest('hex');
        console.log("Using fallback HWID method");
        return fallbackId;

      } catch (error) {
        console.error("All HWID methods failed on Windows:", error);
        // Final fallback - generate a consistent ID based on system info
        const username = os.userInfo().username;
        const hostname = os.hostname();
        const platform_info = os.platform() + os.arch();
        const fallbackId = crypto.createHash('sha256').update(`${username}-${hostname}-${platform_info}`).digest('hex');
        return fallbackId;
      }
    } else if (platform === "linux") {
      try {
        const hwid = fs.readFileSync("/etc/machine-id", "utf-8").trim();
        return hwid;
      } catch (error) {
        console.error("Error reading /etc/machine-id:", error);
        // Fallback for Linux
        const username = os.userInfo().username;
        const hostname = os.hostname();
        const fallbackId = crypto.createHash('sha256').update(`${username}-${hostname}-linux`).digest('hex');
        return fallbackId;
      }
    } else if (platform === "darwin") {
      try {
        const output = execSync("ioreg -l | grep IOPlatformSerialNumber").toString();
        const parts = output.split("=");
        const serial = parts[1]?.trim().replace(/"/g, "") ?? "";
        return serial;
      } catch (error) {
        console.error("Error retrieving serial number on macOS:", error);
        // Fallback for macOS
        const username = os.userInfo().username;
        const hostname = os.hostname();
        const fallbackId = crypto.createHash('sha256').update(`${username}-${hostname}-darwin`).digest('hex');
        return fallbackId;
      }
    } else {
      // Fallback for unsupported platforms
      const username = os.userInfo().username;
      const hostname = os.hostname();
      const platform_info = os.platform() + os.arch();
      const fallbackId = crypto.createHash('sha256').update(`${username}-${hostname}-${platform_info}`).digest('hex');
      return fallbackId;
    }
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async __do_request(data: any) {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(data).toString(),
      });

      if (!response.ok) {
        console.error(`HTTP error! Status: ${response.status}`);
        await this.sleep(5000);
        process.exit(0);
      }

      const responseData = await response.json();
      const dontRunExtra = ["log", "file", "2faenable", "2fadisable"];

      if (dontRunExtra.includes(data.type)) {
        return responseData;
      }

      const signature = response.headers.get("x-signature-ed25519");
      const timestamp = response.headers.get("x-signature-timestamp");

      if (!signature || !timestamp) {
        console.log("Missing signature or timestamp in response headers");
        await this.sleep(5000);
        process.exit(0);
      }

      const server_time = new Date(Number(timestamp) * 1000).toUTCString();
      const current_time = new Date().toUTCString();
      const buffer_seconds = 5;
      const time_difference = Math.abs(new Date(server_time).getTime() - new Date(current_time).getTime()) / 1000;

      if (time_difference > buffer_seconds + 20) {
        console.log(`Time difference is too large: ${time_difference} seconds, try syncing your date and time settings.`);
        await this.sleep(5000);
        process.exit(0);
      }

      if (!verifyKey(Buffer.from(JSON.stringify(responseData), 'utf-8'), signature, timestamp, this.public_key)) {
        console.log("Signature checksum failed. Request was tampered with or session ended most likely.");
        await this.sleep(3000);
        process.exit(0);
      }

      return responseData;
    } catch (error) {
      console.error("Unexpected error:", error);
      await this.sleep(5000);
      process.exit(0);
    }
  }

  private __load_user_data(data: any) {
    this.user_data = {
      username: data["username"],
      ip: data["ip"],
      hwid: data["hwid"] || "N/A",
      expires: data["subscriptions"][0]["expiry"],
      createdate: data["createdate"],
      lastlogin: data["lastlogin"],
      subscription: data["subscriptions"][0]["subscription"],
      subscriptions: data["subscriptions"],
    };
  }

  // Method to set user data (for stored credentials)
  setUserData(userData: KeyAuthUserData) {
    this.user_data = userData;
  }

  // Method to clear user data
  clearUserData() {
    this.user_data = null;
  }
}

// KeyAuth configuration
const KeyAuthApp = new KeyAuth({
  name: "csvgen-electron", // Your application name from KeyAuth dashboard
  ownerid: "hvkFRk9A87", // Your Owner ID from KeyAuth dashboard
  version: "1.0", // Your application version
})

export interface LicenseInfo {
  username: string
  subscription: string
  subscriptionExpiry: string
  ip: string
  hwid: string
  createDate: string
  lastLogin: string
}

export interface AuthResponse {
  success: boolean
  message: string
  info?: LicenseInfo
}

class KeyAuthMainService {
  private isInitialized = false
  private currentUser: LicenseInfo | null = null

  async initialize(): Promise<boolean> {
    try {
      await KeyAuthApp.init()
      this.isInitialized = true
      console.log('KeyAuth initialized successfully')
      return true
    } catch (error: unknown) {
      console.error('KeyAuth initialization failed:', error)
      return false
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return {
          success: false,
          message: 'Failed to initialize authentication system'
        }
      }
    }

    try {
      await KeyAuthApp.login(username, password)

      // Get user info after successful login
      const userInfo: LicenseInfo = {
        username: KeyAuthApp.user_data?.username || username,
        subscription: KeyAuthApp.user_data?.subscription || 'Unknown',
        subscriptionExpiry: new Date((KeyAuthApp.user_data?.expires || 0) * 1000).toISOString(),
        ip: KeyAuthApp.user_data?.ip || 'Unknown',
        hwid: KeyAuthApp.user_data?.hwid || 'Unknown',
        createDate: new Date((KeyAuthApp.user_data?.createdate || 0) * 1000).toISOString(),
        lastLogin: new Date((KeyAuthApp.user_data?.lastlogin || 0) * 1000).toISOString()
      }

      this.currentUser = userInfo

      return {
        success: true,
        message: 'Login successful',
        info: userInfo
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  async register(username: string, password: string, license: string): Promise<AuthResponse> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return {
          success: false,
          message: 'Failed to initialize authentication system'
        }
      }
    }

    try {
      await KeyAuthApp.register(username, password, license)

      return {
        success: true,
        message: 'Registration successful'
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  }

  async license(licenseKey: string): Promise<AuthResponse> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return {
          success: false,
          message: 'Failed to initialize authentication system'
        }
      }
    }

    try {
      await KeyAuthApp.license(licenseKey)

      // Get user info after successful license activation
      const userInfo: LicenseInfo = {
        username: KeyAuthApp.user_data?.username || 'Licensed User',
        subscription: KeyAuthApp.user_data?.subscription || 'Unknown',
        subscriptionExpiry: new Date((KeyAuthApp.user_data?.expires || 0) * 1000).toISOString(),
        ip: KeyAuthApp.user_data?.ip || 'Unknown',
        hwid: KeyAuthApp.user_data?.hwid || 'Unknown',
        createDate: new Date((KeyAuthApp.user_data?.createdate || 0) * 1000).toISOString(),
        lastLogin: new Date((KeyAuthApp.user_data?.lastlogin || 0) * 1000).toISOString()
      }

      this.currentUser = userInfo

      return {
        success: true,
        message: 'License activated successfully',
        info: userInfo
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'License activation failed'
      }
    }
  }

  getCurrentUser(): LicenseInfo | null {
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  logout(): void {
    this.currentUser = null
  }

  // Check if subscription is still valid
  isSubscriptionValid(): boolean {
    if (!this.currentUser) return false

    const expiryDate = new Date(this.currentUser.subscriptionExpiry)
    const now = new Date()

    return expiryDate > now
  }

  // Get days remaining in subscription
  getDaysRemaining(): number {
    if (!this.currentUser) return 0

    const expiryDate = new Date(this.currentUser.subscriptionExpiry)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
  }
}

export const keyAuthMainService = new KeyAuthMainService()
export default keyAuthMainService

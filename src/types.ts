

export interface Config {
  driver: string;
  lifetime: number;
  expireOnClose: boolean;
  files: string;
  connection: boolean;
  table: string;
  lottery: number[];
  cookie: string;
  path: string,
  domain?: string,
  secure: boolean,
  httpOnly: boolean,
  encrypt: boolean,
  secret: string,
  trustProxy: boolean,
  trustProxyFn?: Function,
}

export interface SessionHandler {
  read: (sessionId: string, callback: (session: any) => void) => void,
  write: (sessionId: string, data: string, callback: (err?: Error) => void) => void,
  destroy: (sessionId: string, callback: (err?: Error) => void) => void,
  gc: (maxAge: string | number) => void,
  setExists: <T extends SessionHandler>(value: boolean) => T,
}


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
  domain: string | null,
  secure: boolean,
  httpOnly: boolean,
  encrypt: boolean,
  secret: string,
  trustProxy: boolean,
  trustProxyFn: Function | null,
}
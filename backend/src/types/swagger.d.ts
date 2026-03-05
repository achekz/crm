declare module 'swagger-jsdoc' {
  export default function swaggerJSDoc(options: any): any;
}

declare module 'swagger-ui-express' {
  export function serve(req: any, res: any, next: any): void;
  export function setup(spec: any, options?: any): any;
}

declare module 'cron' {
  export class CronJob {
    constructor(
      cronTime: string,
      onTick: () => void | Promise<void>,
      onComplete?: (() => void) | null,
      start?: boolean,
      timeZone?: string
    );
    start(): void;
    stop(): void;
  }
}

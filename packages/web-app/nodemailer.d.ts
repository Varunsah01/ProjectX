declare module "nodemailer" {
  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<unknown>;
  }

  const nodemailer: {
    createTransport(options: {
      host?: string;
      port?: number;
      secure?: boolean;
      auth?: {
        user: string;
        pass: string;
      };
    }): Transporter;
  };

  export default nodemailer;
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private buildRecipientParams(toEmail: string): Record<string, string> {
    return {
      to_email: toEmail,
      email: toEmail,
      user_email: toEmail,
      recipient_email: toEmail,
    };
  }

  private async send(
    templateId: string,
    toEmail: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    const serviceId = this.config.get<string>('EMAILJS_SERVICE_ID');
    const publicKey = this.config.get<string>('EMAILJS_PUBLIC_KEY');
    if (!serviceId || !publicKey || !templateId) {
      this.logger.warn(`EmailJS not configured — skipping email to ${toEmail} (template: ${templateId})`);
      return;
    }
    const privateKey = this.config.get<string>('EMAILJS_PRIVATE_KEY');
    const payload: Record<string, unknown> = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: { ...this.buildRecipientParams(toEmail), ...params },
    };
    if (privateKey) payload['accessToken'] = privateKey;
    const body = JSON.stringify(payload);

    const res = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EmailJS error ${res.status}: ${text}`);
    }
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const resetLink = `${this.config.get<string>('FRONTEND_URL')}/reset-password?token=${rawToken}`;
    await this.send(
      this.config.get<string>('EMAILJS_TEMPLATE_RESET_PASSWORD')!,
      email,
      { reset_link: resetLink },
    );
  }

  async sendAdminInvite(email: string, rawToken: string): Promise<void> {
    const inviteLink = `${this.config.get<string>('FRONTEND_URL')}/admin/accept-invite?token=${rawToken}`;
    await this.send(
      this.config.get<string>('EMAILJS_TEMPLATE_ADMIN_INVITE')!,
      email,
      { invite_link: inviteLink },
    );
  }

  async sendBillingRenewal(
    email: string,
    planName: string,
    amount: number,
    periodEnd: Date,
  ): Promise<void> {
    await this.send(
      this.config.get<string>('EMAILJS_TEMPLATE_BILLING_RENEWAL')!,
      email,
      {
        plan_name: planName,
        amount,
        period_end: periodEnd.toLocaleDateString('uk-UA'),
      },
    );
  }

  async sendPlanChange(email: string, oldPlan: string, newPlan: string): Promise<void> {
    await this.send(
      this.config.get<string>('EMAILJS_TEMPLATE_PLAN_CHANGE')!,
      email,
      { old_plan: oldPlan, new_plan: newPlan },
    );
  }
}

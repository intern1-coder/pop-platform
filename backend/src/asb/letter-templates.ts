// ASB letter templates (parity with Omnia ASB app): first_warning,
// final_warning, notice_seeking_possession (Section 8, Housing Act 1988).

import { addCalendarDays, formatLongDateUK, NOTICE_GROUND_DAYS } from './dates';

export type AsbLetterType = 'first_warning' | 'final_warning' | 'notice_seeking_possession';

export const ASB_LETTER_TYPES: AsbLetterType[] = [
  'first_warning',
  'final_warning',
  'notice_seeking_possession',
];

export interface LetterComplaint {
  reference?: string | null;
  tenantName?: string | null;
  propertyAddress?: string | null;
  landlordName?: string | null;
  landlordAddress?: string | null;
  category?: string | null;
  noticeGround?: string | null;
  noticeServedDate?: Date | string | null;
}

export interface LetterOptions {
  addressee?: string | null;
  generic?: boolean;
}

function today(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function generateLetterContent(
  letterType: AsbLetterType,
  complaint: LetterComplaint,
  complaintsEmail = 'complaints@pop.example.com',
  options: LetterOptions = {},
): string {
  const date = today();
  const tenantName = options.generic ? 'The Occupiers' : options.addressee || complaint.tenantName || 'The Tenant';
  const salutation = options.generic ? 'Dear Resident,' : `Dear ${tenantName},`;
  const address = complaint.propertyAddress || 'the property';
  const ref = complaint.reference || 'ASB-000000';
  const landlordName = complaint.landlordName || 'POP Housing Group';
  const landlordAddress = complaint.landlordAddress ? `\n${complaint.landlordAddress}` : '';

  if (letterType === 'first_warning') {
    return [
      `                                                              ${date}`,
      '',
      `Our Ref: ${ref}`,
      '',
      tenantName,
      address,
      '',
      salutation,
      '',
      'RE: FIRST FORMAL WARNING — ANTI-SOCIAL BEHAVIOUR',
      '',
      'We are writing to you as a formal first warning regarding reports of anti-social behaviour (ASB) at or near the above property.',
      '',
      'We have received complaints from other residents and/or third parties which indicate that behaviour attributed to you and/or members of your household or visitors to your property may amount to a breach of your tenancy agreement, specifically the clause which requires tenants not to cause nuisance, annoyance or disturbance to neighbours or other persons in the locality.',
      '',
      `The behaviour reported includes: ${complaint.category || 'conduct causing nuisance'}.`,
      '',
      'We are required to investigate all complaints of anti-social behaviour seriously. We ask that you take immediate steps to ensure that no further incidents occur. Should the behaviour continue, we will have no alternative but to take further action, which may include the serving of formal legal notices and ultimately an application to Court for possession of your home.',
      '',
      'We strongly urge you to take this letter seriously. If you would like to discuss this matter further, please contact us on the details below within 7 days of the date of this letter.',
      '',
      'Yours sincerely,',
      '',
      'Housing Management Team',
      `${landlordName}${landlordAddress}`,
      'Tel: 0300 123 4567',
      `Email: ${complaintsEmail}`,
      '',
      'This letter constitutes a formal record on your tenancy file.',
    ].join('\n');
  }

  if (letterType === 'final_warning') {
    return [
      `                                                              ${date}`,
      '',
      `Our Ref: ${ref}`,
      '',
      tenantName,
      address,
      '',
      salutation,
      '',
      'RE: FINAL FORMAL WARNING — ANTI-SOCIAL BEHAVIOUR — URGENT ACTION REQUIRED',
      '',
      'We wrote to you previously regarding complaints of anti-social behaviour at or near the above property. Despite this, we continue to receive reports that the behaviour has not ceased.',
      '',
      'This letter serves as your FINAL FORMAL WARNING.',
      '',
      `The continued incidents of anti-social behaviour, namely: ${complaint.category || 'conduct causing nuisance'}, constitute a serious breach of your tenancy conditions. You are required by the terms of your tenancy agreement not to engage in, or allow members of your household or visitors to engage in, behaviour that causes nuisance, annoyance, harassment or disturbance to any person in the locality of your home.`,
      '',
      'We must inform you in the strongest possible terms that if there are any further incidents of anti-social behaviour, we will commence legal proceedings against you without further notice. This is likely to include:',
      '',
      '  — The service of a Notice Seeking Possession under the Housing Act 1988',
      '  — An application to the County Court for a possession order',
      '  — An application for an injunction under the Anti-Social Behaviour, Crime and Policing Act 2014',
      '',
      'A possession order would result in you losing your home.',
      '',
      'We urge you in the strongest terms to seek advice from a housing solicitor or Citizens Advice Bureau immediately if you are unsure of your legal position.',
      '',
      'If you have not already done so, please contact us within 48 hours to discuss this matter. Failure to do so will be noted on your file.',
      '',
      'Yours sincerely,',
      '',
      'Housing Management Team',
      `${landlordName}${landlordAddress}`,
      'Tel: 0300 123 4567',
      `Email: ${complaintsEmail}`,
    ].join('\n');
  }

  if (letterType === 'notice_seeking_possession') {
    const ground = complaint.noticeGround;
    const noticeDays = NOTICE_GROUND_DAYS[ground || ''] ?? 14;
    const groundCite = ground === '14' ? 'Ground 14' : ground === '12' ? 'Ground 12' : 'Ground 12';
    const groundDesc =
      ground === '14'
        ? `GROUND 14: The tenant or a person residing in or visiting the dwelling-house —
   (a) has been guilty of conduct causing or likely to cause a nuisance or annoyance
   to a person residing, visiting or otherwise engaging in a lawful activity in the
   locality; or
   (b) has been convicted of using the dwelling-house or allowing it to be used for
   immoral or illegal purposes, or an arrestable offence committed in, or in the
   locality of, the dwelling-house.`
        : `GROUND 12: Any obligation of the tenancy (other than one related to the payment
   of rent) has been broken or not performed.`;

    const servedBase = complaint.noticeServedDate || new Date();
    const earliestDate = addCalendarDays(servedBase, noticeDays);
    const earliestDateStr = formatLongDateUK(earliestDate);
    const periodWording =
      noticeDays === 0
        ? 'immediately upon service of this Notice'
        : `${noticeDays} days after service of this Notice`;
    const applyWording =
      noticeDays === 0
        ? 'immediately following service of this Notice'
        : `as soon as ${noticeDays} days after this Notice has been given`;

    return [
      `                                                              ${date}`,
      '',
      `Our Ref: ${ref}`,
      '',
      tenantName,
      address,
      '',
      'NOTICE SEEKING POSSESSION OF A DWELLING-HOUSE LET ON AN ASSURED TENANCY',
      '',
      '(Housing Act 1988 as amended by the Housing Act 1996)',
      '',
      `To: ${tenantName}`,
      `Of: ${address}`,
      '',
      'IMPORTANT — PLEASE READ THIS NOTICE CAREFULLY. IF YOU NEED HELP TO UNDERSTAND IT, TAKE IT IMMEDIATELY TO A CITIZENS ADVICE BUREAU, A HOUSING AID CENTRE, A LAW CENTRE OR A SOLICITOR.',
      '',
      '1. The landlord(s) intend(s) to apply to the court for an order requiring you to give up possession of:',
      '',
      `   ${address}`,
      '',
      `2. Your landlord is intending to seek possession on ${groundCite} of Schedule 2 to the Housing Act 1988, as amended by the Housing Act 1996.`,
      '',
      `   ${groundDesc}`,
      '',
      '3. Particulars of each ground are as follows:',
      `   Despite formal written warnings dated previously, the tenant and/or persons residing at or visiting the property have continued to engage in conduct constituting ${complaint.category || 'anti-social behaviour'} causing nuisance and/or annoyance to neighbouring residents and members of the public, in breach of the tenancy agreement and constituting anti-social behaviour within the meaning of the Anti-Social Behaviour, Crime and Policing Act 2014.`,
      '',
      '4. The court proceedings will not begin until after:',
      `   ${earliestDateStr}`,
      `   (being ${periodWording}, the minimum period required under Section 8 of the Housing Act 1988 for ${groundCite}.)`,
      '',
      `5. ${landlordName} will apply to the court ${applyWording}.`,
      '',
      '6. This notice is valid for 12 months from the date given above. Court proceedings must not be begun after this time.',
      '',
      `Signed: ___________________________   Date: ${date}`,
      `On behalf of: ${landlordName}`,
      '',
      'Address for correspondence:',
      `${landlordName}${landlordAddress}`,
      'Housing Management Team',
      'Tel: 0300 123 4567',
      `Email: ${complaintsEmail}`,
      '',
      'NOTE: This Notice is served pursuant to Section 8 of the Housing Act 1988.',
    ].join('\n');
  }

  return `Letter type "${letterType}" is not recognised. Valid types: first_warning, final_warning, notice_seeking_possession.`;
}

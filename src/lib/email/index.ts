import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { brand } from "../config";
import type { NotifyPayload } from "../types";
import { emailLayout } from "./layout";

type Email = { to: string; subject: string; html: string; text: string };

/**
 * Envoi d'e-mail : Resend en production, fichiers locaux en développement
 * (EMAIL_TRANSPORT=file) pour pouvoir tester les parcours sans envoyer de vrais messages.
 */
export async function sendEmail(email: Email) {
  const transport = process.env.EMAIL_TRANSPORT ?? (process.env.RESEND_API_KEY ? "resend" : "file");
  if (transport === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? `${brand.name} <notifications@example.com>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: process.env.EMAIL_REPLY_TO ?? brand.supportEmail,
    });
    if (error) throw new Error(`Envoi e-mail impossible : ${error.message}`);
    return;
  }
  const dir = path.join(process.cwd(), ".emails");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${email.to.replace(/[^a-z0-9@._-]/gi, "_")}.json`);
  await writeFile(file, JSON.stringify(email, null, 2));
  console.info(`[e-mail] ${email.to} : ${email.subject}`);
}

/** Envoie les notifications renvoyées par les fonctions de la base, sans jamais bloquer l'action */
export async function sendNotificationEmails(payloads: NotifyPayload[] | null | undefined) {
  if (!payloads?.length) return;
  await Promise.allSettled(
    payloads.map((p) => {
      const url = `${brand.siteUrl}${p.link}`;
      return sendEmail({
        to: p.email,
        subject: p.title,
        html: emailLayout({
          preheader: p.body,
          heading: p.title,
          paragraphs: [`Bonjour ${p.first_name},`, p.body],
          cta: { label: "Ouvrir dans Équipia", url },
          footer: "Vous pouvez désactiver ces e-mails dans votre profil.",
        }),
        text: `Bonjour ${p.first_name},\n\n${p.body}\n\n${url}`,
      });
    }),
  );
}

export function signupEmail(link: string, firstName: string): Omit<Email, "to"> {
  return {
    subject: `Confirmez votre adresse pour créer votre espace ${brand.name}`,
    html: emailLayout({
      preheader: "Un clic pour confirmer votre adresse e-mail.",
      heading: "Confirmez votre adresse e-mail",
      paragraphs: [
        `Bonjour ${firstName},`,
        `Merci d'avoir choisi ${brand.name}. Confirmez votre adresse : vous choisirez ensuite votre mot de passe et créerez l'espace de votre entreprise. Le lien est valable 24 heures.`,
      ],
      cta: { label: "Confirmer mon adresse", url: link },
      footer: "Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement ce message.",
    }),
    text: `Bonjour ${firstName},\n\nConfirmez votre adresse pour créer votre espace ${brand.name} :\n${link}\n\nLe lien est valable 24 heures.`,
  };
}

export function existingAccountEmail(link: string): Omit<Email, "to"> {
  return {
    subject: `Vous avez déjà un compte ${brand.name}`,
    html: emailLayout({
      preheader: "Connectez-vous avec ce lien.",
      heading: "Vous avez déjà un compte",
      paragraphs: [
        "Quelqu'un (probablement vous) a demandé à créer un compte avec cette adresse, qui en possède déjà un.",
        "Utilisez ce lien pour vous connecter directement. Il est valable 1 heure.",
      ],
      cta: { label: "Me connecter", url: link },
      footer: "Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement ce message.",
    }),
    text: `Vous avez déjà un compte ${brand.name}. Connectez-vous avec ce lien (valable 1 heure) :\n${link}`,
  };
}

export function recoveryEmail(link: string): Omit<Email, "to"> {
  return {
    subject: `Réinitialisation de votre mot de passe ${brand.name}`,
    html: emailLayout({
      preheader: "Choisissez un nouveau mot de passe.",
      heading: "Nouveau mot de passe",
      paragraphs: ["Vous avez demandé à réinitialiser votre mot de passe. Le lien est valable 1 heure."],
      cta: { label: "Choisir un nouveau mot de passe", url: link },
      footer: "Vous n'êtes pas à l'origine de cette demande ? Votre mot de passe reste inchangé.",
    }),
    text: `Choisissez un nouveau mot de passe (lien valable 1 heure) :\n${link}`,
  };
}

export function inviteEmail(p: { link: string; firstName: string; orgName: string; inviter: string }): Omit<Email, "to"> {
  return {
    subject: `${p.inviter} vous invite à rejoindre ${p.orgName} sur ${brand.name}`,
    html: emailLayout({
      preheader: "Posez vos congés et suivez vos soldes depuis votre téléphone.",
      heading: `Rejoignez ${p.orgName}`,
      paragraphs: [
        `Bonjour ${p.firstName},`,
        `${p.inviter} vous invite sur ${brand.name}, l'outil de ${p.orgName} pour poser vos congés, suivre vos soldes et voir le planning de l'équipe.`,
        "Le lien est valable 24 heures. Vous choisirez votre mot de passe à la première connexion.",
      ],
      cta: { label: "Rejoindre l'espace", url: p.link },
      footer: `Cette invitation a été envoyée par ${p.orgName}.`,
    }),
    text: `Bonjour ${p.firstName},\n\n${p.inviter} vous invite à rejoindre ${p.orgName} sur ${brand.name} :\n${p.link}\n\nLe lien est valable 24 heures.`,
  };
}

export function accessRemovedEmail(p: { firstName: string; orgName: string }): Omit<Email, "to"> {
  return {
    subject: `Votre accès à ${p.orgName} sur ${brand.name} a été désactivé`,
    html: emailLayout({
      preheader: `Vous ne pouvez plus vous connecter à l'espace ${p.orgName}.`,
      heading: "Votre accès a été désactivé",
      paragraphs: [
        `Bonjour ${p.firstName},`,
        `${p.orgName} a désactivé votre accès à son espace ${brand.name}. Vous ne pouvez plus vous y connecter ni poser d'absence.`,
        "Vos absences et vos soldes restent conservés par l'entreprise. Pour toute question (solde de tout compte, attestation, erreur), contactez directement votre responsable ou le service RH.",
      ],
      footer: `Ce message a été envoyé automatiquement pour ${p.orgName}.`,
    }),
    text: `Bonjour ${p.firstName},\n\n${p.orgName} a désactivé votre accès à son espace ${brand.name}. Vous ne pouvez plus vous y connecter.\n\nPour toute question, contactez votre responsable ou le service RH.`,
  };
}

export function accessRestoredEmail(p: { firstName: string; orgName: string; link: string }): Omit<Email, "to"> {
  return {
    subject: `Votre accès à ${p.orgName} sur ${brand.name} est rétabli`,
    html: emailLayout({
      preheader: `Vous pouvez de nouveau vous connecter à l'espace ${p.orgName}.`,
      heading: "Bon retour parmi nous",
      paragraphs: [
        `Bonjour ${p.firstName},`,
        `${p.orgName} a rétabli votre accès à son espace ${brand.name}. Vos soldes et votre historique d'absences sont toujours là.`,
        "Connectez-vous avec votre adresse e-mail et votre mot de passe habituel. Si vous l'avez oublié, utilisez « Mot de passe oublié ».",
      ],
      cta: { label: "Me connecter", url: p.link },
      footer: `Ce message a été envoyé automatiquement pour ${p.orgName}.`,
    }),
    text: `Bonjour ${p.firstName},\n\n${p.orgName} a rétabli votre accès à son espace ${brand.name}.\nConnectez-vous : ${p.link}`,
  };
}

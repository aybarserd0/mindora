import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const text = `
Mindora Danışan Başvurusu

Ad Soyad: ${data.name}
Telefon: ${data.phone}
Yaş: ${data.age}
Konu: ${data.topic}
Süre: ${data.duration}
Önce destek: ${data.previousSupport}
Başlama: ${data.startTime}
Tercih: ${data.preference}
Müsaitlik: ${(data.availability || []).join(', ')}
Not: ${data.note || '-'}
`;

    await transporter.sendMail({
      from: `"Mindora Danışan" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: 'Mindora Danışan Başvurusu',
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
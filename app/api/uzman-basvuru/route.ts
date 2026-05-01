import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const {
      name,
      phone,
      email,
      title,
      areas = [],
      experience,
      online,
      price,
      availability = [],
      expectation,
      note,
    } = data;

    if (!name || !phone || !email || !title) {
      return NextResponse.json(
        { ok: false, error: 'Zorunlu alanlar eksik.' },
        { status: 400 }
      );
    }

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
Mindora Uzman Başvurusu

Ad Soyad: ${name}
Telefon: ${phone}
E-posta: ${email}
Ünvan: ${title}
Uzmanlık Alanları: ${areas.join(', ')}
Deneyim: ${experience || '-'}
Online Çalışma: ${online || '-'}
Seans Ücreti: ${price || '-'}
Uygun Saatler: ${availability.join(', ')}
Mindora’dan Beklenti: ${expectation || '-'}
Ek Not: ${note || '-'}
`;

    await transporter.sendMail({
      from: `"Mindora Başvuru" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: 'Mindora Uzman Başvurusu',
      text,
      replyTo: email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Uzman başvuru mail hatası:', error);

    return NextResponse.json(
      { ok: false, error: 'Başvuru gönderilemedi.' },
      { status: 500 }
    );
  }
}
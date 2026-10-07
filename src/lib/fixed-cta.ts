import { Language } from '@/services/sheets';

/**
 * The spoken close of every video, identical for all topics and signs. It is written by hand and
 * inserted by the app instead of being generated: a CTA that had to be invented for each script
 * was what made the model pack 108, dasha and the link into one sentence, break the grammar
 * around them and then burn repair calls on the same script.
 *
 * It carries the three things the close has to do: the video cannot settle the viewer's own case,
 * the answer is read from the Moon sign, the 108 divisions and the planetary period they are in,
 * and the reading itself is free through the link in the profile.
 */
export const FIXED_CTA: Record<Language, string> = {
  ja: 'あなた自身の正確な鑑定には、太陽星座とは異なる月星座、さらに詳細な108の区分、そして現在巡っている惑星期（ダシャー）が必要です。プロフィールのリンクから無料で確認できます。',
  en: 'An accurate reading needs your Moon sign, not your sun sign, the finer 108 divisions, and the planetary period you are in now. Check yours free through the link in the profile.',
  es: 'Una lectura precisa necesita tu signo lunar, distinto del solar, las 108 divisiones más finas y el periodo planetario que atraviesas ahora. Consulta la tuya gratis en el enlace del perfil.',
  pt: 'Uma leitura precisa exige o seu signo lunar, diferente do solar, as 108 divisões mais finas e o período planetário que você atravessa agora. Veja a sua de graça no link do perfil.',
  id: 'Pembacaan yang akurat memerlukan zodiak bulan Anda, yang berbeda dari zodiak matahari, 108 pembagian yang lebih rinci, dan periode planet yang sedang Anda jalani. Cek milik Anda gratis lewat tautan di profil.',
  ar: 'القراءة الدقيقة تحتاج إلى برجك القمري، وهو يختلف عن برجك الشمسي، وإلى التقسيمات الـ108 الأدق، وإلى الفترة الكوكبية التي تمر بها الآن. تحقق من قراءتك مجانا عبر الرابط في الملف الشخصي.',
  fr: 'Une lecture juste demande votre signe lunaire, différent du signe solaire, les 108 divisions plus fines et la période planétaire que vous traversez. Vérifiez la vôtre gratuitement via le lien du profil.',
  de: 'Eine genaue Deutung braucht dein Mondzeichen, das sich von deinem Sonnenzeichen unterscheidet, die feineren 108 Abschnitte und die Planetenperiode, in der du gerade stehst. Prüfe deine kostenlos über den Link im Profil.',
};

export function fixedCta(language: Language): string {
  return FIXED_CTA[language];
}

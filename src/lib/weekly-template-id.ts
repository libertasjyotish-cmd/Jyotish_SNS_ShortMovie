/** Indonesian weekly reading (Anda). Same worry order as `JA_WORRIES`; written by hand. */
import type { Sign } from '@/lib/placements';
import { zodiacName } from '@/lib/zodiac-names';
import { isNode, LanguagePack, Worry } from '@/lib/weekly-template-pack';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'id') ?? s;

const PLANET: Record<string, string> = {
  Sun: 'Matahari', Mars: 'Mars', Mercury: 'Merkurius', Jupiter: 'Jupiter', Venus: 'Venus',
  Saturn: 'Saturnus', Rahu: 'Rahu', Ketu: 'Ketu',
};

const NATURE: Record<string, string> = {
  Sun: 'Matahari, planet ekspresi diri,',
  Mars: 'Mars, planet dorongan dan tindakan,',
  Mercury: 'Merkurius, planet pikiran dan ucapan,',
  Jupiter: 'Jupiter, planet pertumbuhan,',
  Venus: 'Venus, planet cinta dan kenyamanan,',
  Saturn: 'Saturnus, planet tanggung jawab dan kesabaran,',
  Rahu: 'Rahu, yang memperbesar keinginan,',
  Ketu: 'Ketu, yang melonggarkan keterikatan,',
};

const FIELD: Record<number, string> = {
  1: 'cara Anda memandang diri sendiri',
  2: 'uang, kata-kata, dan hal yang Anda hargai',
  3: 'komunikasi sehari-hari dan dorongan untuk bertindak',
  4: 'rumah dan ketenangan batin',
  5: 'cinta, kesenangan, dan bakat Anda',
  6: 'tugas harian dan kesehatan Anda',
  7: 'hubungan dekat Anda',
  8: 'cara menghadapi perubahan mendadak',
  9: 'keyakinan dan arah hidup Anda',
  10: 'pekerjaan dan kedudukan Anda',
  11: 'pertumbuhan penghasilan dan pertemanan',
  12: 'cara Anda beristirahat dan melepaskan',
};

const WORRIES: Record<number, Worry[]> = {
  1: [
    ['apakah Anda sulit percaya pada diri sendiri?', 'sulit percaya pada diri sendiri', 'mengenali lagi kekuatan Anda satu per satu.'],
    ['apakah Anda bingung harus mulai dari mana?', 'bingung harus mulai dari mana', 'memilih satu langkah kecil pertama.'],
    ['apakah Anda merasa tertekan saat membandingkan diri dengan orang lain?', 'merasa tertekan saat membandingkan diri dengan orang lain', 'menemukan lagi ritme Anda sendiri.'],
    ['apakah hari-hari Anda terasa berlalu begitu saja?', 'merasa hari-hari berlalu begitu saja', 'mengingat lagi apa yang benar-benar ingin Anda lakukan.'],
    ['apakah Anda tetap lelah meski sudah beristirahat?', 'tetap lelah meski sudah beristirahat', 'mendahulukan kesehatan Anda.'],
  ],
  2: [
    ['apakah kekhawatiran soal uang sulit hilang?', 'sulit lepas dari kekhawatiran soal uang', 'melihat lagi apa yang benar-benar membuat Anda merasa aman.'],
    ['apakah Anda merasa uang tidak pernah bertahan lama?', 'merasa uang tidak pernah bertahan lama', 'meninjau ulang cara Anda membelanjakan uang dengan tenang.'],
    ['apakah Anda sulit mengungkapkan perasaan dengan kata-kata?', 'sulit mengungkapkan perasaan dengan kata-kata', 'berlatih mengatakan apa yang benar-benar Anda rasakan.'],
    ['apakah Anda takut kehilangan apa yang Anda miliki?', 'takut kehilangan apa yang Anda miliki', 'memilih lagi apa yang benar-benar penting bagi Anda.'],
    ['apakah Anda meremehkan nilai diri Anda?', 'meremehkan nilai diri Anda', 'melihat dengan jujur apa saja yang bisa Anda lakukan.'],
  ],
  3: [
    ['apakah Anda sulit menemukan keberanian untuk bertindak?', 'sulit menemukan keberanian untuk bertindak', 'menumpuk tindakan kecil satu per satu.'],
    ['apakah Anda merasa maksud Anda tidak tersampaikan?', 'merasa maksud Anda tidak tersampaikan', 'mencoba cara baru menyampaikan pikiran dengan tenang.'],
    ['apakah Anda merasa sudah berusaha tetapi tidak maju?', 'merasa sudah berusaha tetapi tidak maju', 'menyadari sejauh mana usaha Anda telah membawa Anda.'],
    ['apakah Anda terlalu menahan diri di depan rekan kerja?', 'terlalu menahan diri di depan rekan kerja', 'menyampaikan ide Anda tanpa ragu.'],
    ['apakah Anda ingin memulai hal baru tetapi tidak bisa melangkah?', 'ingin memulai hal baru tetapi tidak bisa melangkah', 'membiarkan diri Anda sekadar mencoba.'],
  ],
  4: [
    ['apakah Anda sulit santai bahkan di rumah?', 'sulit santai bahkan di rumah', 'menemukan lagi kebiasaan yang menenangkan Anda.'],
    ['apakah Anda sulit terbuka kepada keluarga?', 'sulit terbuka kepada keluarga', 'membangun lagi rasa aman dengan orang-orang terdekat.'],
    ['apakah naik turunnya perasaan membuat Anda kewalahan?', 'merasa kewalahan oleh naik turunnya perasaan', 'menata hari-hari yang menjaga hati tetap stabil.'],
    ['apakah Anda merasa tidak punya tempat untuk benar-benar beristirahat?', 'merasa tidak punya tempat untuk benar-benar beristirahat', 'menumbuhkan ruang tenang di dalam diri.'],
    ['apakah urusan keluarga membuat hati Anda tidak tenang?', 'merasa urusan keluarga membuat hati tidak tenang', 'memisahkan apa yang bisa dan tidak bisa Anda ubah.'],
  ],
  5: [
    ['apakah Anda sulit menikmati hal yang Anda sukai?', 'sulit menikmati hal yang Anda sukai', 'mencari lagi apa yang benar-benar menggerakkan hati Anda.'],
    ['apakah Anda menyukai seseorang tetapi ragu melangkah lebih jauh?', 'menyukai seseorang tetapi ragu melangkah lebih jauh', 'memperjelas hubungan seperti apa yang Anda inginkan.'],
    ['apakah Anda meragukan bakat Anda sendiri?', 'meragukan bakat Anda sendiri', 'mengasah satu hal yang Anda kuasai.'],
    ['apakah Anda ingin tantangan baru tetapi takut gagal?', 'ingin tantangan baru tetapi takut gagal', 'mencoba dalam skala kecil dan menambah pengalaman.'],
    ['apakah Anda bertemu orang baru tetapi tidak ada yang bertahan?', 'bertemu orang baru tetapi tidak ada yang bertahan', 'meninjau ulang hubungan seperti apa yang benar-benar Anda nikmati.'],
  ],
  6: [
    ['apakah Anda lelah memikul semua tugas sendirian?', 'lelah memikul semua tugas sendirian', 'memilih apa yang bisa Anda serahkan kepada orang lain.'],
    ['apakah hubungan di tempat kerja menguras tenaga Anda?', 'merasa hubungan di tempat kerja menguras tenaga', 'belajar menjaga jarak yang melindungi Anda.'],
    ['apakah Anda sulit menolak sampai jadwal Anda penuh?', 'sulit menolak sampai jadwal penuh', 'meninjau ulang apa saja yang Anda sanggupi.'],
    ['apakah Anda merasa bersalah setiap kali beristirahat?', 'merasa bersalah setiap kali beristirahat', 'menganggap istirahat sebagai bagian dari tugas.'],
    ['apakah Anda merasa dikejar kesibukan setiap hari?', 'merasa dikejar kesibukan setiap hari', 'menata hari dengan ritme yang bisa Anda jaga.'],
  ],
  7: [
    ['apakah Anda tidak tahu perasaan sebenarnya orang terdekat?', 'tidak tahu perasaan sebenarnya orang terdekat', 'mendengarkan orang lain sampai selesai.'],
    ['apakah Anda terlalu banyak mengalah dalam hubungan?', 'terlalu banyak mengalah dalam hubungan', 'menyampaikan juga apa yang Anda inginkan.'],
    ['apakah Anda ragu membiarkan orang lain mendekat?', 'ragu membiarkan orang lain mendekat', 'perlahan memperdalam hubungan dengan orang yang Anda percaya.'],
    ['apakah waktu terus berlalu tanpa Anda mengungkapkan isi hati?', 'merasa waktu berlalu tanpa mengungkapkan isi hati', 'menyampaikan isi hati dengan tenang.'],
    ['apakah Anda merasa hanya Anda yang berusaha?', 'merasa hanya Anda yang berusaha', 'meninjau ulang cara saling mendukung.'],
  ],
  8: [
    ['apakah kecemasan tentang masa depan sulit hilang?', 'sulit lepas dari kecemasan tentang masa depan', 'fokus pada apa yang bisa Anda ubah.'],
    ['apakah Anda takut bergantung pada orang lain?', 'takut bergantung pada orang lain', 'membiarkan orang yang Anda percaya ikut memikul sedikit.'],
    ['apakah Anda sulit menerima perubahan di sekitar Anda?', 'sulit menerima perubahan di sekitar Anda', 'melepas cara lama dan membangun kembali.'],
    ['apakah soal uang di masa depan membuat Anda gelisah?', 'gelisah soal uang di masa depan', 'memeriksa persiapan Anda dengan tenang.'],
    ['apakah Anda memendam kekhawatiran yang tidak bisa diceritakan?', 'memendam kekhawatiran yang tidak bisa diceritakan', 'perlahan menghadapi isi hati yang terdalam.'],
  ],
  9: [
    ['apakah Anda bertanya-tanya apakah jalan Anda sudah benar?', 'bertanya-tanya apakah jalan Anda sudah benar', 'memastikan nilai yang ingin Anda pegang.'],
    ['apakah sesuatu yang selama ini Anda yakini mulai goyah?', 'merasa keyakinan Anda mulai goyah', 'memilih lagi apa yang benar-benar bisa Anda yakini.'],
    ['apakah Anda lupa untuk apa Anda bekerja keras?', 'lupa untuk apa Anda bekerja keras', 'mempelajari hal baru dan menemukan lagi tujuan Anda.'],
    ['apakah Anda ingin belajar lebih banyak tetapi belum bisa mulai?', 'ingin belajar lebih banyak tetapi belum bisa mulai', 'mulai mempelajari satu hal yang menarik minat Anda.'],
    ['apakah Anda merasa tidak punya panutan?', 'merasa tidak punya panutan', 'mencari pemikiran yang benar-benar bisa Anda hormati.'],
  ],
  10: [
    ['apakah Anda merasa kerja keras Anda tidak dihargai?', 'merasa kerja keras Anda tidak dihargai', 'membangun lagi pencapaian Anda dengan tekun.'],
    ['apakah Anda ragu pekerjaan sekarang cocok untuk Anda?', 'ragu pekerjaan sekarang cocok untuk Anda', 'memikirkan ulang cara kerja yang Anda inginkan ke depan.'],
    ['apakah tanggung jawab Anda terus bertambah tanpa imbalan?', 'merasa tanggung jawab terus bertambah tanpa imbalan', 'memilih lagi pekerjaan mana yang Anda ambil.'],
    ['apakah Anda ingin pindah kerja tetapi belum bisa memutuskan?', 'ingin pindah kerja tetapi belum bisa memutuskan', 'memastikan lagi kekuatan Anda.'],
    ['apakah orang-orang di kantor membuat pagi Anda terasa berat?', 'merasa orang-orang di kantor membuat pagi terasa berat', 'kembali fokus pada peran Anda sendiri.'],
  ],
  11: [
    ['apakah Anda merasa usaha Anda tidak tercermin pada penghasilan?', 'merasa usaha tidak tercermin pada penghasilan', 'mengembangkan satu keahlian yang menghasilkan.'],
    ['apakah Anda merasa tidak cocok di antara teman-teman?', 'merasa tidak cocok di antara teman-teman', 'menghargai hubungan dengan orang yang benar-benar sejalan.'],
    ['apakah Anda hampir menyerah pada keinginan Anda?', 'hampir menyerah pada keinginan Anda', 'memecah keinginan Anda menjadi target kecil.'],
    ['apakah Anda merasa tertinggal saat tidak diajak?', 'merasa tertinggal saat tidak diajak', 'menyapa seseorang lebih dulu.'],
    ['apakah Anda merasa tidak ada cara menambah penghasilan?', 'merasa tidak ada cara menambah penghasilan', 'mencari peluang lewat orang-orang yang Anda kenal.'],
  ],
  12: [
    ['apakah Anda tetap lelah meski sudah tidur?', 'tetap lelah meski sudah tidur', 'meluangkan waktu sendiri untuk benar-benar beristirahat.'],
    ['apakah Anda merasa bersalah karena ingin waktu sendiri?', 'merasa bersalah karena ingin waktu sendiri', 'memakai waktu sendiri untuk memulihkan diri.'],
    ['apakah ada sesuatu yang ingin Anda lepaskan tetapi tidak bisa?', 'ingin melepaskan sesuatu tetapi tidak bisa', 'meringankan beban satu per satu.'],
    ['apakah Anda merasa pengeluaran terus menumpuk?', 'merasa pengeluaran terus menumpuk', 'memilih lagi apa yang benar-benar Anda butuhkan.'],
    ['apakah Anda merasakan lelah mendalam yang tidak kunjung hilang?', 'merasakan lelah mendalam yang tidak kunjung hilang', 'membiarkan diri tidak melakukan apa pun sejenak.'],
  ],
};

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const ID: LanguagePack = {
  worries: WORRIES,
  field: FIELD,
  write({ moon, chosen, house, period, day, worry: [hook, reason, use] }) {
    const planet = PLANET[chosen.planet];
    const field = FIELD[house];
    const from = `dari zodiak bulan ${sign(moon)}`;
    const lead = `Dalam astrologi Weda, ${period},`;
    let opening: string;
    let cause: string;
    if (chosen.ingress && day) {
      opening = `${lead} ${planet} masuk ke ${sign(chosen.ingress.sign)}, rumah ke-${house} ${from}, pada ${day.date} ${MONTHS[day.month]}.`;
      cause = `memasuki bidang ${field}`;
    } else if (chosen.retrograde && !isNode(chosen.planet)) {
      opening = `${lead} ${planet} sedang retrograde di ${sign(chosen.sign)}, rumah ke-${chosen.house} ${from}.`;
      cause = `sedang retrograde dan mengajak Anda meninjau ulang ${field}`;
    } else {
      opening = `${lead} ${planet} berada di ${sign(chosen.sign)}, rumah ke-${chosen.house} ${from}.`;
      cause =
        chosen.planet === 'Rahu'
          ? `memperkuat perhatian Anda pada ${field}`
          : chosen.planet === 'Ketu'
            ? `menjauhkan hati Anda dari ${field}`
            : `bekerja kuat pada ${field}`;
    }
    return {
      hook: `Bulan di ${sign(moon)}, ${hook}`,
      body: `${opening} Jika Anda ${reason}, itu karena ${NATURE[chosen.planet]} ${cause}. Saatnya ${use}`,
    };
  },
};

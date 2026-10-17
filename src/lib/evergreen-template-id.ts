/** Indonesian Mon–Wed per-sign evergreen scripts (Anda): same structure and chart reasoning as the ja/en sets. */
import { SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';
import { EvergreenTemplate, RULER, signFrom } from '@/lib/evergreen-template';
import { zodiacName } from '@/lib/zodiac-names';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'id') ?? s;
const PLANET: Record<string, string> = {
  Sun: 'Matahari', Moon: 'Bulan', Mars: 'Mars', Mercury: 'Merkurius', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturnus',
};
type L3 = [string, string, string];

const WORK: Record<Sign, L3> = {
  Capricorn: ['Anda menyalahkan diri saat hasil kerja lambat datang?', 'membangun kepercayaan yang kokoh dari waktu ke waktu', 'organisasi yang bertahan lama atau jabatan yang penuh tanggung jawab'],
  Aquarius: ['merasa tidak cocok dengan rekan kerja?', 'melihat gambaran besar dan menemukan cara baru', 'teknologi, riset, atau membangun sistem'],
  Pisces: ['lelah dinilai hanya dari angka?', 'menolong orang dan meringankan beban mereka', 'mengajar, membimbing, atau melayani orang'],
  Aries: ['Anda menahan kekuatan agar tidak mengganggu orang?', 'memutuskan sendiri dan bergerak lebih dulu', 'memulai proyek baru atau memimpin di depan'],
  Taurus: ['lelah selalu menjadi pusat perhatian?', 'mengenali kualitas dan membuatnya bertahan', 'kuliner, desain, atau pekerjaan yang bernilai nyata'],
  Gemini: ['sesak melakukan tugas yang sama setiap hari?', 'mengumpulkan informasi dan menjelaskannya dengan jelas', 'menulis, penjualan, atau menghubungkan orang'],
  Cancer: ['seharian sibuk menjaga suasana hati orang lain?', 'merasakan perasaan orang dan menenangkan mereka', 'perhotelan atau melayani orang'],
  Leo: ['merasa kurang dihargai saat bekerja di belakang layar?', 'tampil di depan dan memikul tanggung jawab', 'memimpin tim atau bekerja dengan nama sendiri'],
  Virgo: ['jarak antara cita-cita dan pekerjaan harian terasa berat?', 'menyempurnakan setiap detail dengan teliti', 'analisis atau pengendalian mutu'],
  Libra: ['Anda bekerja keras sendirian?', 'menengahi orang dan menjaga keseimbangan', 'negosiasi atau pekerjaan yang menyatukan orang'],
  Scorpio: ['pekerjaan yang dangkal membuat Anda hampa?', 'mendalami satu hal sampai tuntas', 'riset atau analisis yang mendalam'],
  Sagittarius: ['sulit menemukan makna dalam pekerjaan?', 'menunjukkan tujuan yang lebih besar dan membimbing orang', 'pendidikan, hukum, atau pekerjaan internasional'],
};
const COMPAT: Record<Sign, L3> = {
  Aries: ['Anda selalu yang memulai dalam hubungan?', 'memiliki dorongan Mars dan bergerak lurus', 'orang yang bisa Anda ajak bicara terus terang'],
  Taurus: ['lelah dengan orang yang mudah berubah pikiran?', 'memiliki ketenangan Venus dan menghargai yang bertahan lama', 'orang yang membangun kepercayaan perlahan'],
  Gemini: ['lelah bersama orang yang tidak bisa diajak bicara?', 'memiliki kelincahan Merkurius dan terhubung lewat kata', 'orang yang mengikuti irama obrolan Anda'],
  Cancer: ['lelah selalu memperhatikan orang lain?', 'memiliki kelembutan Bulan dan ingin melindungi', 'orang yang membuat Anda bisa menjadi diri sendiri'],
  Leo: ['kehilangan diri karena selalu menyesuaikan?', 'memiliki kehangatan Matahari dan menyinari orang', 'orang yang senang melihat Anda bersinar'],
  Virgo: ['lelah memperhatikan setiap hal kecil?', 'memiliki ketelitian Merkurius dan ingin berguna', 'orang yang menghargai perhatian Anda'],
  Libra: ['menyembunyikan perasaan demi menghindari konflik?', 'memiliki keselarasan Venus dan menjaga keseimbangan', 'orang yang menerima kejujuran Anda dengan tenang'],
  Scorpio: ['pertemanan yang dangkal terasa kurang?', 'menyimpan kekuatan Mars di dalam dan mencari ikatan yang dalam', 'orang yang bisa Anda percaya bertahun-tahun'],
  Sagittarius: ['merasa hubungan menjadi penjara?', 'memiliki kemurahan Jupiter dan ingin menjelajah', 'orang yang menghormati kebebasan masing-masing'],
  Capricorn: ['merasa sendiri karena tidak pernah menunjukkan kelemahan?', 'memiliki keteguhan Saturnus dan memikul tanggung jawab', 'orang yang juga menerima sisi rapuh Anda'],
  Aquarius: ['merasa paling berbeda di kelompok?', 'memiliki kejernihan Saturnus dan melihat semua orang setara', 'orang yang menikmati perbedaan kalian'],
  Pisces: ['lelah menanggung perasaan orang lain?', 'memiliki welas asih Jupiter dan merasakan luka orang', 'orang yang membalas kebaikan Anda'],
};
const LOVE: Record<Sign, L3> = {
  Aries: ['dalam cinta, Anda menunggu dan tak pernah melangkah dulu?', 'mengungkapkan perasaan secara langsung', 'pasangan yang menyukai kejujuran Anda'],
  Taurus: ['terlalu banyak berpikir soal cinta?', 'menumbuhkan cinta perlahan dan nyaman', 'pasangan yang membuat Anda tenang'],
  Gemini: ['gelisah saat obrolan dengan pasangan berhenti?', 'berbagi kata dan tawa', 'pasangan yang bisa diajak bicara apa saja'],
  Cancer: ['berpura-pura kuat dan sulit bersandar pada pasangan?', 'membangun ikatan hangat yang saling melindungi', 'pasangan yang membuat Anda bisa menjadi diri sendiri'],
  Leo: ['dalam cinta, Anda selalu yang mengalah?', 'merasa dicintai dan menunjukkan cinta terang-terangan', 'pasangan yang bangga pada Anda'],
  Virgo: ['banyak memberi tetapi merasa tak dilihat pasangan?', 'mendukung pasangan dengan perhatian kecil', 'pasangan yang memperhatikan hal-hal kecil'],
  Libra: ['menghindari setiap perbedaan dengan pasangan?', 'membangun hubungan yang anggun dan saling menghormati', 'pasangan yang memperlakukan Anda setara'],
  Scorpio: ['cinta yang sesaat membuat Anda hampa?', 'menyatu dalam-dalam dengan satu orang', 'pasangan yang menerima perasaan Anda yang sebenarnya'],
  Sagittarius: ['merasa terkekang saat pasangan terlalu mengikat?', 'belajar dan memperluas dunia bersama', 'pasangan yang mendukung kebebasan dan mimpi Anda'],
  Capricorn: ['terlalu berhati-hati dalam cinta sampai kesempatan lewat?', 'membangun cinta yang penuh kepercayaan', 'pasangan yang menepati janji'],
  Aquarius: ['romansa biasa terasa membosankan?', 'berbincang bebas seperti sahabat', 'pasangan yang menyukai cara Anda'],
  Pisces: ['dalam cinta, Anda memberi terlalu banyak?', 'terhubung dari hati ke hati, melampaui kata', 'pasangan yang membalas kebaikan Anda'],
};
const MONEY: Record<Sign, L3> = {
  Aries: ['ingin menabung, tetapi cepat habis?', 'bertindak tegas dan menghasilkan sendiri', 'pekerjaan tempat Anda membuka jalan sendiri'],
  Taurus: ['menahan hal yang Anda suka karena takut kurang uang?', 'mengenali kualitas dan menumbuhkan nilainya', 'pekerjaan dengan barang berkualitas'],
  Gemini: ['gelisah hanya punya satu penghasilan?', 'memakai informasi untuk menghasilkan dari banyak jalan', 'pekerjaan yang memakai pengetahuan dan kata'],
  Cancer: ['terlalu banyak mengeluarkan uang untuk orang lain?', 'melindungi kehidupan orang yang Anda sayangi', 'pekerjaan yang menopang hidup sehari-hari orang'],
  Leo: ['mengeluarkan uang hanya demi gengsi?', 'mengubah nama dan reputasi menjadi penghasilan', 'pekerjaan yang menampilkan diri Anda'],
  Virgo: ['sudah berhemat tetapi tetap sulit menabung?', 'mengatur keuangan dengan teliti dan menghindari pemborosan', 'pekerjaan dengan angka'],
  Libra: ['sulit menolak saat urusan uang?', 'menghasilkan berkat kepercayaan dengan orang lain', 'bekerja bersama mitra'],
  Scorpio: ['memendam sendiri kecemasan soal uang?', 'membaca arus uang dan menumbuhkannya', 'cara menghasilkan yang tumbuh seiring waktu'],
  Sagittarius: ['lelah terus memikirkan uang?', 'mengubah ilmu dan pengalaman menjadi kekayaan', 'pekerjaan yang memakai ilmu Anda'],
  Capricorn: ['cemas karena uang tumbuh begitu lambat?', 'membangun aset yang kokoh langkah demi langkah', 'pekerjaan yang Anda jalani bertahun-tahun'],
  Aquarius: ['cara biasa mencari uang tidak cocok untuk Anda?', 'menghasilkan dari sistem dan ide baru', 'pekerjaan daring atau teknologi baru'],
  Pisces: ['memberi begitu banyak sampai tak tersisa untuk diri sendiri?', 'menolong orang dan mengubah kepercayaan itu menjadi kelimpahan', 'pekerjaan yang menolong orang'],
};
const FAMILY: Record<Sign, L3> = {
  Aries: ['sering berbenturan dengan keluarga?', 'melindungi keluarga dengan tangan sendiri', 'rumah tempat semua bisa bicara terus terang'],
  Taurus: ['bahkan di rumah Anda tak bisa beristirahat?', 'merawat kehidupan yang tenang dan nyaman', 'rumah yang tidak terburu-buru'],
  Gemini: ['merasa tak pernah benar-benar bicara dengan keluarga?', 'terhubung dengan keluarga lewat kata', 'meja makan tempat bisa membicarakan apa saja'],
  Cancer: ['lelah mengkhawatirkan keluarga?', 'merangkul keluarga dengan kasih dan melindungi mereka', 'rumah tempat Anda juga dirawat'],
  Leo: ['merasa keluarga tidak menghargai Anda?', 'berada di tengah dan menyemangati semua', 'keluarga yang mengakui usaha tiap orang'],
  Virgo: ['menanggung sendiri urusan rumah?', 'mengurus setiap detail kehidupan keluarga', 'keluarga yang berbagi beban'],
  Libra: ['selalu Anda yang mendamaikan keluarga?', 'menjaga keluarga tetap seimbang dan rukun', 'rumah tempat semua mau sedikit mengalah'],
  Scorpio: ['sulit jujur bahkan pada keluarga?', 'terhubung dalam dengan orang terdekat', 'keluarga yang menerima perasaan tiap orang'],
  Sagittarius: ['nilai keluarga tidak sejalan dengan nilai Anda?', 'berbagi cara hidup yang Anda yakini', 'rumah yang menghormati jalan tiap orang'],
  Capricorn: ['menanggung sendiri beban keluarga?', 'menunaikan kewajiban pada keluarga', 'keluarga yang saling menopang'],
  Aquarius: ['merasa paling berbeda di keluarga?', 'menerima tiap anggota keluarga apa adanya', 'rumah yang menghormati pendapat semua'],
  Pisces: ['selalu menaruh diri sendiri paling akhir demi keluarga?', 'menemani luka keluarga dan menopangnya', 'keluarga yang membalas kebaikan Anda'],
};
const REST: Record<Sign, L3> = {
  Aries: ['sudah berbaring tetapi tetap lelah?', 'bergerak lebih memulihkan Anda daripada diam', 'waktu untuk berkeringat'],
  Taurus: ['terburu-buru terus membuat pikiran ikut lelah?', 'dikelilingi hal yang nyaman membuat Anda rileks', 'waktu menikmati musik atau aroma yang Anda suka'],
  Gemini: ['pikiran terus berputar sampai sulit tidur?', 'menuangkan pikiran ke dalam kata melegakan Anda', 'waktu untuk mengobrol dengan seseorang'],
  Cancer: ['lelah merawat semua orang?', 'tempat yang terasa aman memulihkan Anda', 'tempat Anda juga dirawat'],
  Leo: ['hampir habis karena terlalu berusaha?', 'waktu saat tak ada yang melihat memulihkan Anda', 'waktu sendiri tanpa peran apa pun'],
  Virgo: ['bahkan saat libur memikirkan tugas?', 'ruang yang rapi menenangkan pikiran Anda', 'ruang yang tenang dan rapi'],
  Libra: ['lelah selalu memperhatikan orang lain?', 'hal yang indah mengembalikan keseimbangan Anda', 'waktu memandang pemandangan yang Anda suka'],
  Scorpio: ['menyembunyikan lelah dari semua orang?', 'tidur nyenyak sendirian adalah cara Anda pulih', 'tidur yang tak diganggu siapa pun'],
  Sagittarius: ['rutinitas yang sama menguras Anda?', 'tempat dan ide baru membuka pikiran Anda', 'jalan-jalan ke tempat yang belum dikenal'],
  Capricorn: ['merasa bersalah saat beristirahat?', 'istirahat di jam yang tetap membuat Anda stabil', 'jam istirahat yang tetap setiap hari'],
  Aquarius: ['lelah hanya karena berada di tengah orang?', 'menjauh sesuai irama sendiri memulihkan Anda', 'waktu dengan irama Anda sendiri'],
  Pisces: ['lelah menyerap perasaan semua orang?', 'musik dan air menjernihkan pikiran Anda', 'waktu mendengar musik yang tenang'],
};
const IMPRESSION: Record<Sign, L3> = {
  Aries: ['orang menganggap Anda menakutkan?', 'cara Anda bertindak tanpa ragu terlihat keras', 'peran memimpin di depan'],
  Taurus: ['orang menganggap Anda lamban?', 'sikap tenang Anda terlihat lambat', 'hubungan jangka panjang'],
  Gemini: ['orang menganggap Anda tidak serius?', 'cara bicara yang cepat dan ringan terlihat sembrono', 'peran menghubungkan orang'],
  Cancer: ['orang menganggap suasana hati Anda mudah berubah?', 'setiap perasaan terlihat di wajah Anda', 'saat menopang orang lain'],
  Leo: ['orang menganggap Anda sombong?', 'sikap percaya diri Anda terlihat angkuh', 'peran yang mengumpulkan orang'],
  Virgo: ['orang menganggap Anda kaku dan menuntut?', 'mata Anda yang teliti terlihat keras', 'pekerjaan merapikan sesuatu'],
  Libra: ['orang menganggap Anda ingin disukai semua?', 'bersikap ramah pada semua orang terlihat begitu', 'peran sebagai penengah'],
  Scorpio: ['orang bilang tak tahu apa yang Anda pikirkan?', 'menyimpan isi hati terlihat misterius', 'peran yang dipercaya memegang hal penting'],
  Sagittarius: ['orang menganggap Anda ceroboh?', 'selalu melihat gambaran besar terlihat kurang teliti', 'peran membimbing orang'],
  Capricorn: ['orang menganggap Anda dingin?', 'mendahulukan kewajiban daripada perasaan terlihat kaku', 'pekerjaan penting yang dipercayakan pada Anda'],
  Aquarius: ['orang menganggap Anda agak aneh?', 'berpikir dengan cara sendiri terlihat ganjil', 'saat dibutuhkan ide baru'],
  Pisces: ['orang menganggap Anda tidak bisa diandalkan?', 'kebaikan yang tak pernah menyalahkan terlihat lemah', 'saat menghibur orang lain'],
};
const AVOID: Record<Sign, L3> = {
  Aries: ['tempat kerja penuh perdebatan menguras Anda?', 'amarah dan persaingan membuat Anda habis', 'tempat yang bicara dengan tenang'],
  Taurus: ['lingkungan yang kacau membuat Anda tegang?', 'perubahan mendadak yang terus-menerus mengguncang Anda', 'tempat dengan rutinitas yang stabil'],
  Gemini: ['lelah dengan pesan dan obrolan tanpa henti?', 'terlalu banyak kata membuat pikiran tak bisa istirahat', 'tempat tenang untuk fokus'],
  Cancer: ['merasa sepi di lingkungan yang dingin?', 'tempat tanpa pengertian menyesakkan hati Anda', 'tempat orang saling peduli'],
  Leo: ['lelah di tempat yang tak pernah mengakui usaha Anda?', 'diperlakukan seolah tak penting menggerus rasa percaya diri', 'tempat yang memberi Anda tanggung jawab nyata'],
  Virgo: ['tempat yang berantakan menguras Anda?', 'kekacauan dan kecerobohan membuat Anda tegang', 'tempat yang mengerjakan sesuatu dengan baik'],
  Libra: ['lelah terjepit di antara orang yang bertengkar?', 'perlakuan tidak adil merusak keseimbangan Anda', 'tempat yang memperlakukan semua dengan adil'],
  Scorpio: ['lelah di tempat penuh permainan politik?', 'hubungan tanpa ketulusan membuat Anda tegang', 'tempat tanpa hal yang disembunyikan'],
  Sagittarius: ['aturan tanpa makna menyesakkan Anda?', 'aturan tanpa tujuan memadamkan semangat Anda', 'tempat yang memercayai penilaian Anda'],
  Capricorn: ['pekerjaan yang tak ada habisnya menguras Anda?', 'tanggung jawab yang menumpuk membebani hati', 'tempat dengan peran jelas dan istirahat nyata'],
  Aquarius: ['merasa terkekang saat dipaksa ikut kebiasaan lama?', 'tempat yang menolak perubahan menahan Anda', 'tempat untuk mencoba ide baru'],
  Pisces: ['lelah menanggung masalah semua orang?', 'diandalkan tanpa batas menguras Anda', 'tempat Anda bisa menjaga waktu sendiri'],
};
const TURNING: Record<Sign, L3> = {
  Aries: ['hampir ingin meninggalkan semuanya?', 'tiba-tiba, setelah benturan atau saat Anda mencapai batas', 'sebelum pergi karena emosi, tentukan dulu satu langkah berikutnya'],
  Taurus: ['takut pada perubahan penghasilan atau tempat tinggal?', 'perlahan, lewat perubahan uang atau tempat tinggal', 'pilih satu bagian hidup untuk dipertahankan dan lepaskan sisanya'],
  Gemini: ['ada cerita orang yang terus terngiang?', 'lewat perkenalan atau obrolan biasa', 'temui orangnya minggu itu juga untuk tahu lebih banyak'],
  Cancer: ['ragu mengubah hidup karena keluarga?', 'lewat urusan keluarga atau pindah rumah', 'beri keinginan Anda bobot yang sama dengan keluarga'],
  Leo: ['posisi Anda sekarang terasa sempit?', 'sebagai promosi atau permintaan untuk tampil di depan', 'terima peran itu sekali saja, meski ragu'],
  Virgo: ['merasa kesehatan atau jadwal Anda tak bertahan?', 'lewat perubahan kesehatan', 'berhenti memaksakan diri dan ubah ritme Anda'],
  Libra: ['pernikahan atau perpisahan mengguncang hidup Anda?', 'lewat perubahan dalam hubungan dekat', 'pilih menurut cara hidup Anda, bukan demi orang lain'],
  Scorpio: ['menyimpan kekhawatiran yang tak bisa diceritakan?', 'saat masalah tersembunyi muncul ke permukaan', 'ceritakan pada orang yang Anda percaya'],
  Sagittarius: ['ingin belajar lagi atau pergi ke luar negeri?', 'lewat ilmu baru atau tempat yang jauh', 'kunjungi sekali kursus atau tempat yang menarik bagi Anda'],
  Capricorn: ['ragu meninggalkan pekerjaan bertahun-tahun?', 'saat sesuatu yang Anda jalani lama berakhir', 'bawa semua yang sudah Anda bangun ke tempat berikutnya'],
  Aquarius: ['berpikir bekerja di luar perusahaan?', 'saat keluar dari organisasi atau memulai sesuatu bersama orang', 'cari orang yang sepemikiran'],
  Pisces: ['firasat yang tak bisa dijelaskan membuat Anda gelisah?', 'lewat intuisi atau pertemuan yang kebetulan', 'jangan abaikan intuisi itu, coba dalam skala kecil'],
};
const HABIT: Record<Sign, [string, string, string, string]> = {
  Aries: ['Anda selalu membalas seketika?', 'Anda bergerak sebelum memutuskan', 'Tunda jawaban penting sampai besok', 'Anda akan jauh lebih jarang menyesal'],
  Taurus: ['menggenggam barang dan orang yang sudah tak cocok?', 'Anda terus menjaga apa yang sudah dimiliki', 'Lepaskan satu barang yang tak pernah dipakai', 'napas Anda akan terasa lebih lega'],
  Gemini: ['melihat ponsel sampai menjelang tidur?', 'Anda selalu mencari informasi baru', 'Lepaskan layar satu jam sebelum tidur', 'keramaian di kepala akan tenang'],
  Cancer: ['suasana hati orang selalu Anda pikirkan?', 'Anda merasakan perasaan orang seperti milik sendiri', 'Berhenti mencoba memperbaiki suasana hati semua orang', 'perasaan Anda sendiri akan kembali'],
  Leo: ['terus maju sendiri tanpa pernah mengeluh?', 'Anda ingin menjadi sandaran semua orang', 'Minta bantuan untuk satu hal saja', 'beban di pundak akan berkurang'],
  Virgo: ['memeriksa berulang kali yang sudah selesai?', 'setiap kesalahan kecil mengganggu Anda', 'Periksa sekali lalu berhenti', 'waktu dan tenaga akan tersisa'],
  Libra: ['bilang ya padahal ingin bilang tidak?', 'Anda tak ingin merusak suasana', 'Katakan tidak dengan jelas sekali saja', 'hubungan dengan orang akan lebih ringan'],
  Scorpio: ['terus memikirkan ucapan orang?', 'luka tertanam dalam di hati Anda', 'Ceritakan pada orang yang Anda percaya', 'sesak di dada akan longgar'],
  Sagittarius: ['mengisi jadwal terlalu penuh?', 'Anda ikut semua yang terlihat seru', 'Hapus satu janji', 'Anda akan benar-benar menikmati tiap acara'],
  Capricorn: ['memikirkan pekerjaan bahkan saat libur?', 'Anda selalu mendahulukan tanggung jawab', 'Jangan buka pesan kerja saat libur', 'minggu berikutnya akan terasa berbeda'],
  Aquarius: ['memutuskan semua sendiri tanpa bersandar?', 'Anda tak ingin melepas cara sendiri', 'Ikuti ide orang lain sekali saja', 'jalan yang tak terduga akan terbuka'],
  Pisces: ['mustahil bagi Anda untuk menolak?', 'Anda tak bisa membiarkan orang yang butuh', 'Jangan langsung menjawab, ambil waktu berpikir', 'Anda akan menjaga waktu sendiri'],
};
const NATURE: Record<Sign, L3> = {
  Aries: ['lelah selalu menyesuaikan diri?', 'membuka jalan sendiri dengan kaki sendiri', 'menghadapi tantangan yang Anda pilih sendiri'],
  Taurus: ['cemas dengan kecepatan orang lain?', 'menumbuhkan sesuatu yang kokoh seiring waktu', 'tekun pada satu hal dengan sabar'],
  Gemini: ['mengkritik diri karena tahu sedikit dari banyak hal?', 'belajar lalu meneruskannya', 'menceritakan apa yang Anda pelajari'],
  Cancer: ['selalu menaruh diri sendiri paling akhir?', 'orang yang Anda sayangi merasa aman', 'menghabiskan waktu tenang bersama orang terdekat'],
  Leo: ['mundur saat waktunya tampil?', 'hidup dengan cara yang bisa Anda banggakan', 'mengatakan pendapat dengan yakin'],
  Virgo: ['sulit melihat kelebihan sendiri?', 'memberi yang terbaik dengan cara yang berguna', 'dengan mudah menyelesaikan masalah orang'],
  Libra: ['cemas karena tak punya pendapat sendiri?', 'menciptakan keselarasan di antara orang', 'mendekatkan orang yang tak saling paham'],
  Scorpio: ['terlalu memikirkan segala hal?', 'kebenaran di balik permukaan', 'mendalami satu hal sampai tuntas'],
  Sagittarius: ['merasa ada yang kurang dalam hidup?', 'terus belajar dan memperluas pandangan', 'menjelajahi ide atau tempat baru'],
  Capricorn: ['merasa terlalu serius?', 'menunaikan tanggung jawab dalam jangka panjang', 'melangkah setahap demi setahap ke tujuan Anda'],
  Aquarius: ['merasa tak terhubung dengan orang sekitar?', 'berpikir di luar kebiasaan untuk menciptakan hal baru', 'mencoba sesuatu dengan cara Anda'],
  Pisces: ['cemas karena terlalu merasakan luka orang?', 'menyadari luka yang tersembunyi dan menemaninya', 'mendengarkan seseorang dalam diam'],
};
const SUN_TRAIT: Record<Sign, string> = {
  Aries: 'penuh semangat dan aksi', Taurus: 'tenang dan konsisten', Gemini: 'cerdas dan mudah bergaul',
  Cancer: 'rumahan dan penuh kasih', Leo: 'bersinar dan pemimpin', Virgo: 'teliti dan perfeksionis',
  Libra: 'menawan dan anggun', Scorpio: 'intens dan tertutup', Sagittarius: 'bebas dan optimis',
  Capricorn: 'serius dan pekerja keras', Aquarius: 'unik dan tidak biasa', Pisces: 'lembut dan pemimpi',
};

const P = (s: Sign) => PLANET[RULER[s]];
const VA = 'Dalam astrologi Weda,';
const hk = (m: Sign, h: string) => `Bulan di ${sign(m)}, ${h}`;

const SERIES: Record<SignThemeSeries, (m: Sign) => EvergreenTemplate> = {
  work: (m) => { const s = signFrom(m, 10); const [h, a, b] = WORK[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-10 Anda, rumah pekerjaan. Itulah sebabnya Anda mampu ${a}. Dalam ${b}, kekuatan Anda muncul dengan sendirinya.` }; },
  compat: (m) => { const [h, a, b] = COMPAT[m];
    return { hook: hk(m, h), body: `${VA} kecocokan dilihat dari Bulan ke Bulan, bukan Matahari. Bulan di ${sign(m)} ${a}. Dengan ${b}, hati terhubung dengan sendirinya.` }; },
  love: (m) => { const s = signFrom(m, 5); const [h, a, b] = LOVE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-5 Anda, rumah cinta. Itulah sebabnya Anda ingin ${a}. Dengan ${b}, cinta itu berbalas.` }; },
  money: (m) => { const s = signFrom(m, 2); const [h, a, b] = MONEY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-2 Anda, rumah uang. Itulah sebabnya Anda mampu ${a}. Dalam ${b}, uang mengalir dengan sendirinya.` }; },
  family: (m) => { const s = signFrom(m, 4); const [h, a, b] = FAMILY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-4 Anda, rumah keluarga. Itulah sebabnya Anda ingin ${a}. Di ${b}, Anda benar-benar tenang.` }; },
  rest: (m) => { const s = signFrom(m, 12); const [h, a, b] = REST[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-12 Anda, rumah istirahat. Itulah sebabnya ${a}. Dengan ${b}, tenaga kembali dengan sendirinya.` }; },
  impression: (m) => { const [h, a, b] = IMPRESSION[m];
    return { hook: hk(m, h), body: `${VA} ${P(m)} berkaitan dengan rumah ke-1 Anda, wajah yang Anda tunjukkan. Itulah sebabnya ${a}. Dalam ${b}, kesan itu menjadi kepercayaan.` }; },
  avoid: (m) => { const s = signFrom(m, 6); const [h, a, b] = AVOID[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-6 Anda, rumah hal yang menguras Anda. Itulah sebabnya ${a}. Di ${b}, Anda kembali menjadi diri sendiri.` }; },
  turning: (m) => { const s = signFrom(m, 8); const [h, a, b] = TURNING[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-8 Anda, rumah titik balik. Titik balik Anda datang ${a}. Saat itu, ${b}.` }; },
  habit: (m) => { const [h, a, b, c] = HABIT[m];
    return { hook: hk(m, h), body: `${VA} Bulan Anda, yang menunjukkan hati, membawa sifat ${P(m)}. Itulah sebabnya ${a}. ${b}, dan ${c}.` }; },
  nature: (m) => { const s = signFrom(m, 9); const [h, a, b] = NATURE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} berkaitan dengan rumah ke-9 Anda, poros hidup Anda. Yang benar-benar Anda hargai adalah ${a}. Saat ${b}, Anda paling menjadi diri sendiri.` }; },
  sidereal: (sun) => ({
    hook: `${sign(sun)}, ramalan bilang Anda ${SUN_TRAIT[sun]}. Terasa bukan Anda?`,
    body: 'Astrologi Weda membaca watak dari Bulan, bukan Matahari, dan memakai posisi bintang yang sebenarnya. Banyak orang punya Matahari dan Bulan di zodiak berbeda; mungkin itu sebabnya ramalan tak pernah pas.',
  }),
};

export function buildEvergreenTemplateId(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const m = asSign(moonSign);
  return m && SIGNS.includes(m) ? SERIES[series](m) : null;
}

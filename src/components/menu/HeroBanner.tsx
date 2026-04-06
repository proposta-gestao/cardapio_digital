import bannerImg from "@/assets/banner.jpg";
import logoImg from "@/assets/logo.png";

const HeroBanner = () => {
  return (
    <header className="relative w-full h-48 sm:h-64 md:h-72 overflow-hidden">
      <img
        src={bannerImg}
        alt="Mesa com pratos deliciosos da Estela Panelas"
        className="w-full h-full object-cover"
        width={1920}
        height={640}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-3">
        <img
          src={logoImg}
          alt="Logo Estela Panelas"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-card shadow-lg p-1"
          width={56}
          height={56}
        />
        <div>
          <h1 className="text-primary-foreground text-xl sm:text-2xl font-heading font-bold drop-shadow-lg">
            Estela Panelas
          </h1>
          <p className="text-primary-foreground/80 text-xs sm:text-sm">
            Comida artesanal feita com amor 🍲
          </p>
        </div>
      </div>
    </header>
  );
};

export default HeroBanner;

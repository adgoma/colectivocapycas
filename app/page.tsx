import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid" style={{ gap: "1.2rem" }}>
      <article className="card">
        <h1 className="title">Somos Colectivo de ex indeterminados CAS y CAP</h1>
        <p className="subtitle">
          Plataforma oficial para publicar comunicados, gestiones y evidencias de las acciones realizadas por
          el colectivo de ex trabajadores de la Contraloria General de la Republica del Peru.
        </p>
        <div className="actions">
          <Link href="/gestiones" className="button button--primary">
            Ver gestiones
          </Link>
          <Link href="/documentos" className="button button--ghost">
            Revisar documentos
          </Link>
        </div>
      </article>

      <section className="grid grid--3">
        <article className="card">
          <h2 className="title">Comunicados</h2>
          <p>Publicaciones cronologicas con acuerdos, reuniones y acciones del colectivo.</p>
        </article>
        <article className="card">
          <h2 className="title">Documentos</h2>
          <p>Repositorio de oficios, escritos legales, memoriales y anexos en PDF.</p>
        </article>
        <article className="card">
          <h2 className="title">Galeria</h2>
          <p>Fotografias de reuniones, plantones y actividades institucionales.</p>
        </article>
      </section>
    </section>
  );
}


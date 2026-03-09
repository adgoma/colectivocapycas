export default function AdminPage() {
  return (
    <article className="card">
      <h1 className="title">Resumen de administracion</h1>
      <p className="subtitle">
        Esta area permitira crear, editar y publicar contenido para toda la web del colectivo.
      </p>
      <ul>
        <li>Comunicados: avisos oficiales para los miembros del colectivo.</li>
        <li>Gestiones: cronologia de avances y acciones institucionales.</li>
        <li>Documentos: archivos adjuntos con categoria y fecha.</li>
        <li>Galeria: fotos agrupadas por album.</li>
        <li>Organizacion: datos institucionales editables.</li>
      </ul>
    </article>
  );
}

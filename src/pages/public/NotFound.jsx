import { Button, EmptyState } from "../../components/ui";

export default function NotFound({ title = "Halaman tidak ditemukan", description = "Alamat yang Anda tuju tidak tersedia atau sudah dipindahkan." }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <EmptyState icon="search-alt" title={title} description={description} action={<Button to="/" icon="home">Kembali ke Beranda</Button>} />
    </div>
  );
}

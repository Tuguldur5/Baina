import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.terms.title,
  description: mn.seo.terms.description,
};

/** "Хэрэглэх нөхцөл" static page. */
export default function TermsPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-text">
        {mn.static.terms.title}
      </h1>
      <p className="mt-6 leading-8 text-muted">{mn.static.terms.body}</p>

      {mn.static.terms.sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-lg font-bold text-text">{section.title}</h2>
          <p className="mt-2 leading-8 text-muted">{section.text}</p>
        </section>
      ))}

      <p className="mt-10 text-sm text-muted">
        {mn.footer.contact}: {mn.footer.email}
      </p>
      </div>
    </Container>
  );
}

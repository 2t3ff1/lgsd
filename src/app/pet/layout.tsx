export const metadata = { title: "LGSD Pet" };

export default function PetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
      `}</style>
      {children}
    </>
  );
}

import { PublicDirectoryShell } from "@/components/ui/PublicDirectoryShell";

export default function DirectoryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicDirectoryShell>{children}</PublicDirectoryShell>;
}

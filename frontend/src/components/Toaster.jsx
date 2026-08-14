import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group toast !rounded-none !border !border-foreground !bg-card !text-foreground !shadow-[6px_6px_0_0_var(--color-border)] !font-sans !gap-3 !px-4 !py-3',
          title: '!text-[11px] !uppercase !tracking-[0.18em] !font-medium',
          description: '!text-xs !text-muted-foreground !font-mono !normal-case',
          icon: '!hidden',
          actionButton:
            '!rounded-none !border !border-foreground !bg-foreground !text-background !text-[10px] !uppercase !tracking-[0.16em]',
          cancelButton:
            '!rounded-none !border !border-border !bg-background !text-muted-foreground !text-[10px] !uppercase !tracking-[0.16em]',
          error: '!border-destructive !text-destructive',
          success: '!border-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

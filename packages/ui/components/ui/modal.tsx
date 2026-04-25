"use client";

import { Dispatch, SetStateAction } from "react";
import * as React from "react";
// import { useRouter } from "next/router";
import { Drawer as DrawerPrimitive } from "vaul";

// React 19 compat: cast vaul Drawer components to include children/className
const DrawerRoot = DrawerPrimitive.Root as React.ComponentType<
  React.ComponentProps<typeof DrawerPrimitive.Root> & { children?: React.ReactNode }
>;
const DrawerPortal = DrawerPrimitive.Portal as React.ComponentType<
  React.ComponentProps<typeof DrawerPrimitive.Portal> & { children?: React.ReactNode }
>;
const DrawerOverlay = DrawerPrimitive.Overlay as React.ComponentType<{
  className?: string;
}>;
const DrawerContent = DrawerPrimitive.Content as React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;
const Drawer = { Root: DrawerRoot, Portal: DrawerPortal, Overlay: DrawerOverlay, Content: DrawerContent };

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ModalProps {
  children: React.ReactNode;
  className?: string;
  showModal?: boolean;
  setShowModal?: Dispatch<SetStateAction<boolean>>;
  onClose?: () => void;
  desktopOnly?: boolean;
  preventDefaultClose?: boolean;
}

export function Modal({
  children,
  className,
  showModal,
  setShowModal,
  onClose,
  desktopOnly,
  preventDefaultClose,
}: ModalProps) {
  // const router = useRouter();

  const closeModal = ({ dragged }: { dragged?: boolean } = {}) => {
    if (preventDefaultClose && !dragged) {
      return;
    }
    // fire onClose event if provided
    onClose && onClose();

    // if setShowModal is defined, use it to close modal
    if (setShowModal) {
      setShowModal(false);
    }
    // else, this is intercepting route @modal
    // else {
    // router.back();
    // }
  };
  const { isMobile } = useMediaQuery();

  if (isMobile && !desktopOnly) {
    return (
      <Drawer.Root
        open={setShowModal ? showModal : true}
        onOpenChange={(open) => {
          if (!open) {
            closeModal({ dragged: true });
          }
        }}
      >
        <Drawer.Overlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
        <Drawer.Portal>
          <Drawer.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mt-24 overflow-hidden rounded-t-[10px] border bg-background",
              className,
            )}
          >
            <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-inherit">
              <div className="my-3 h-1.5 w-16 rounded-full bg-muted-foreground/20" />
            </div>
            {children}
          </Drawer.Content>
          <Drawer.Overlay />
        </Drawer.Portal>
      </Drawer.Root>
    );
  }
  return (
    <Dialog
      open={setShowModal ? showModal : true}
      onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "overflow-hidden p-0 md:max-w-md md:rounded-2xl md:border",
          className,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Building, Route, Sword } from "lucide-react";
import { ActionPanel, ActionGroup } from "../components/ActionPanel.js";
import { ActionButton } from "../components/ActionButton.js";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "../components/Drawer.js";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../internal/ui/dialog.js";
import { ThemedButton } from "../components/ThemedButton.js";

const meta: Meta = {
  title: "Panels",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

export const CompactPanel: Story = {
  name: "ActionPanel — compact",
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 320 }}>
      <ActionPanel title="Actions">
        <ActionGroup title="Build">
          <ActionButton label="Build Road" icon={Route} onClick={fn()} />
          <ActionButton
            label="Build Settlement"
            icon={Building}
            onClick={fn()}
          />
        </ActionGroup>
      </ActionPanel>
    </div>
  ),
};

export const NormalPanel: Story = {
  name: "ActionPanel — normal",
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 480 }}>
      <ActionPanel title="Your turn" state="playerActions">
        <ActionGroup title="Build" description="Construct buildings and roads">
          <ActionButton label="Build Road" icon={Route} onClick={fn()} />
          <ActionButton
            label="Build Settlement"
            icon={Building}
            onClick={fn()}
          />
        </ActionGroup>
        <ActionGroup title="Combat" variant="danger">
          <ActionButton
            label="Attack"
            icon={Sword}
            variant="danger"
            onClick={fn()}
          />
        </ActionGroup>
      </ActionPanel>
    </div>
  ),
};

export const FocusOrder: Story = {
  name: "Focus order",
  parameters: {
    docs: {
      description: {
        story:
          "Tab moves through the disclosure header → first group action → next group, exposing focus order without depending on a runtime adapter.",
      },
    },
  },
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 480 }}>
      <ActionPanel title="Focus order" defaultExpanded>
        <ActionGroup title="First">
          <ActionButton label="A" onClick={fn()} />
          <ActionButton label="B" onClick={fn()} />
        </ActionGroup>
        <ActionGroup title="Second">
          <ActionButton label="C" onClick={fn()} />
        </ActionGroup>
      </ActionPanel>
    </div>
  ),
};

export const MobileBottomSheet: Story = {
  name: "Mobile bottom sheet",
  globals: {
    viewport: { value: "phonePortrait" },
  },
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="sb-stage" style={{ minHeight: "100vh" }}>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <ThemedButton>Open sheet</ThemedButton>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Pick a card</DrawerTitle>
              <DrawerDescription>
                Sheet chrome is presentational only — no commit semantics.
              </DrawerDescription>
            </DrawerHeader>
            <div className="sb-stage" style={{ padding: 16 }}>
              <ActionButton label="Choose alpha" onClick={fn()} />
              <ActionButton label="Choose beta" onClick={fn()} />
            </div>
            <DrawerFooter>
              <ThemedButton variant="primary" onClick={() => setOpen(false)}>
                Confirm
              </ThemedButton>
              <ThemedButton variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </ThemedButton>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    );
  },
};

export const DialogStandard: Story = {
  name: "Dialog — modal",
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <ThemedButton>Open dialog</ThemedButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm trade</DialogTitle>
            <DialogDescription>
              Trade two wood for one gem with the bank.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ThemedButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </ThemedButton>
            <ThemedButton variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </ThemedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

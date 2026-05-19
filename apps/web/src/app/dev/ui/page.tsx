"use client";

import type { CardRarity } from "@shardveil/shared";
import * as React from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";

const RARITIES: CardRarity[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-content-primary text-xl border-b border-stroke-base pb-2">
        {title}
      </h2>
      <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </section>
  );
}

export default function UiDevPage() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="bg-surface-base min-h-screen p-8 space-y-12">
      <h1 className="font-display text-content-primary text-3xl">
        UI Primitives — Dev Showcase
      </h1>

      {/* Button */}
      <Section title="Button">
        <Button intent="primary" size="sm">
          Primary SM
        </Button>
        <Button intent="primary" size="md">
          Primary MD
        </Button>
        <Button intent="primary" size="lg">
          Primary LG
        </Button>
        <Button intent="secondary">Secondary</Button>
        <Button intent="ghost">Ghost</Button>
        <Button intent="danger">Danger</Button>
        <Button intent="primary" loading>
          Loading
        </Button>
        <Button intent="primary" disabled>
          Disabled
        </Button>
      </Section>

      {/* Card */}
      <Section title="Card">
        <Card className="w-48">
          <p className="text-content-secondary text-sm">Plain card</p>
        </Card>
        <Card rarity="epic" className="w-48">
          <p className="text-content-secondary text-sm">Epic card</p>
        </Card>
        <Card rarity="legendary" className="w-48">
          <p className="text-content-secondary text-sm">Legendary card</p>
        </Card>
      </Section>

      {/* Skeleton */}
      <Section title="Skeleton">
        <Skeleton className="h-4 w-32" />
        <SkeletonText className="w-48" />
        <SkeletonCard className="w-48" />
      </Section>

      {/* Badge */}
      <Section title="Badge">
        <Badge>Default</Badge>
        {RARITIES.map((r) => (
          <Badge key={r} variant="rarity" rarity={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </Badge>
        ))}
      </Section>

      {/* Avatar */}
      <Section title="Avatar">
        <Avatar size="sm" address="0xAbCdEf" />
        <Avatar size="md" address="0xAbCdEf" />
        <Avatar size="lg" address="0xAbCdEf" />
        <Avatar
          size="md"
          src="https://api.dicebear.com/9.x/pixel-art/svg?seed=shardveil"
          address="0xTest"
        />
      </Section>

      {/* Spinner */}
      <Section title="Spinner">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </Section>

      {/* Tooltip */}
      <Section title="Tooltip">
        <Tooltip content="This is a tooltip" side="top">
          <Button intent="secondary" size="sm">
            Hover me (top)
          </Button>
        </Tooltip>
        <Tooltip content="Bottom tooltip" side="bottom">
          <Button intent="secondary" size="sm">
            Hover me (bottom)
          </Button>
        </Tooltip>
      </Section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="font-display text-content-primary text-xl border-b border-stroke-base pb-2">
          Tabs
        </h2>
        <Tabs
          defaultValue="tab1"
          tabs={[
            {
              value: "tab1",
              label: "Overview",
              content: (
                <p className="text-content-secondary text-sm">
                  Overview tab content.
                </p>
              ),
            },
            {
              value: "tab2",
              label: "Details",
              content: (
                <p className="text-content-secondary text-sm">
                  Details tab content.
                </p>
              ),
            },
          ]}
        />
      </section>

      {/* EmptyState */}
      <Section title="EmptyState">
        <EmptyState
          title="No cards found"
          description="Start collecting cards to build your deck."
          action={{ label: "Open Pack", onClick: () => {} }}
        />
      </Section>

      {/* Modal */}
      <Section title="Modal">
        <Button intent="primary" onClick={() => setModalOpen(true)}>
          Open Modal
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
        >
          <p className="text-content-secondary text-sm">
            This is modal content. Press the X or click outside to close.
          </p>
        </Modal>
      </Section>
    </div>
  );
}

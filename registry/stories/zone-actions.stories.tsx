import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import { CardBack } from "../items/card";
import { Pile } from "../items/pile";
import { ZoneActions } from "../items/zone-actions";

function AuthoredPile() {
  const [spread, setSpread] = useState(false);
  const [count, setCount] = useState(3);
  return (
    <div className="db-table flex flex-col items-center gap-6 rounded-xl p-6 [--card-w:72px]">
      <div data-zone-actions-root className="rounded-lg">
        {spread ? (
          <div className="flex min-h-40 gap-2" aria-label="Spread cards">
            {Array.from({ length: count }, (_, index) => (
              <CardBack key={index} />
            ))}
          </div>
        ) : (
          <Pile
            count={count}
            label="Deck"
            className="m-0 [&_figcaption]:sr-only"
          >
            <CardBack />
          </Pile>
        )}
        <ZoneActions label="Deck">
          {spread || count > 1 ? (
            <Popover.Close
              render={<Button onClick={() => setSpread(!spread)} />}
            >
              {spread ? "Gather cards" : "Spread cards"}
            </Popover.Close>
          ) : null}
          <Popover.Close
            render={
              <Button
                variant="outline"
                disabled={count === 0}
                onClick={() => setCount(count - 1)}
              />
            }
          >
            Take a card
          </Popover.Close>
        </ZoneActions>
      </div>
      <Button
        onClick={() => {
          setCount(3);
          setSpread(false);
        }}
      >
        Reset deck
      </Button>
    </div>
  );
}

const meta = {
  title: "Registry/Zone Actions",
  component: AuthoredPile,
} satisfies Meta<typeof AuthoredPile>;
export default meta;
export const AuthoredActions: StoryObj<typeof meta> = {};

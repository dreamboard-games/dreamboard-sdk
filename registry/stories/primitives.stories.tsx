import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
function Primitives() {
  return (
    <div className="flex max-w-80 flex-wrap gap-3 p-4">
      <Button className="h-11">Primary action</Button>
      <Button variant="outline" className="h-11" disabled>
        Unavailable
      </Button>
      <Label htmlFor="quantity">Quantity</Label>
      <Input
        id="quantity"
        className="h-11"
        type="number"
        defaultValue={2}
        min={0}
      />
      <Label htmlFor="seat">Seat</Label>
      <NativeSelect id="seat" className="[&_select]:h-11">
        <NativeSelectOption>North</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
const meta = {
  title: "Registry/Primitives",
  component: Primitives,
} satisfies Meta<typeof Primitives>;
export default meta;
export const Controls: StoryObj<typeof meta> = {};

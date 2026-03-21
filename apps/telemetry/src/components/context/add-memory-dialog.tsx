import { PlusIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

export function AddMemoryDialog({
  open,
  onOpenChange,
}: React.PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { files } = useFiles();
  /**
   * Use tanstack form to manage state
   *
   * If a file exists, show it in a file item with brief metadata and a x button to remove it
   * When a file exists, this dialog will use the mutation to upload a file type memory
   * Otherwise, treat it as text only upload
   */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <PlusIcon size={16} /> Memory
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>Add a new memory</DialogHeader>

        <FileItem />

        <form>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" placeholder="Enter title..." />
          </Field>

          <Field>
            <FieldLabel htmlFor="textMemory">Memory</FieldLabel>
            <Textarea
              name="textMemory"
              id="textMemory"
              placeholder="Enter memory..."
            />
          </Field>

          <Field orientation="horizontal" className="w-fit">
            <Switch id="another" />
            <FieldLabel htmlFor="another">Create another</FieldLabel>
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="submit" variant="outline">
                Save
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

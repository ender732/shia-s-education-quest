/** @deprecated Prefer `@/components/arcade/ArcadeHub`. */
import { ArcadeHub } from "@/components/arcade/ArcadeHub";
import type { Task } from "@/components/TaskBoard";
import { arcadeByKey } from "@/lib/arcade/index";

type MathArcadeProps = {
  tasks: Task[];
  userId: string;
};

export function MathArcade({ tasks, userId }: MathArcadeProps) {
  return <ArcadeHub subject={arcadeByKey("math")} tasks={tasks} userId={userId} />;
}

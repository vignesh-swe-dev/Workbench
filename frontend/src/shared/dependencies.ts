/**
 * Task Dependency Graph & Cycle Detection
 */

export interface DependencyNode {
  id: string;
  dependencies: string[];
}

/**
 * Checks if adding `dependsOnId` to `taskId`'s dependencies would create a cycle.
 * @param allTasks map or array of tasks with id and dependencies
 * @param taskId the task being edited
 * @param newDependencyId the task that taskId wants to depend on
 * @returns true if adding this dependency creates a cycle, false if valid
 */
export function wouldCreateDependencyCycle(
  allTasks: Array<{ id: string; dependencies?: string[] }>,
  taskId: string,
  newDependencyId: string
): boolean {
  if (taskId === newDependencyId) {
    return true; // Self-dependency is an immediate cycle
  }

  // Build adjacency list: node -> array of tasks it depends on
  const graph = new Map<string, string[]>();
  for (const t of allTasks) {
    graph.set(t.id, [...(t.dependencies || [])]);
  }

  // Add the hypothetical edge: taskId -> newDependencyId
  const currentDeps = graph.get(taskId) || [];
  if (!currentDeps.includes(newDependencyId)) {
    graph.set(taskId, [...currentDeps, newDependencyId]);
  }

  // We need to check if there is a path from newDependencyId back to taskId.
  // If newDependencyId can reach taskId, then taskId -> newDependencyId -> ... -> taskId is a cycle!
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasPath(current: string, target: string): boolean {
    if (current === target) return true;
    visited.add(current);
    recursionStack.add(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasPath(neighbor, target)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(current);
    return false;
  }

  return hasPath(newDependencyId, taskId);
}

/**
 * Validates whether all prerequisite dependencies for a task are completed ('done')
 */
export function areDependenciesSatisfied(
  prerequisiteTaskIds: string[],
  tasksMap: Map<string, { status: string }>
): { satisfied: boolean; blockingTaskIds: string[] } {
  const blockingTaskIds: string[] = [];

  for (const depId of prerequisiteTaskIds) {
    const task = tasksMap.get(depId);
    if (!task || task.status !== 'done') {
      blockingTaskIds.push(depId);
    }
  }

  return {
    satisfied: blockingTaskIds.length === 0,
    blockingTaskIds,
  };
}

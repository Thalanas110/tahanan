import { useState } from "react";
import { useTasks, useCreateTask, useUpdateTaskStatus, useDeleteTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";
import type { TaskStatus } from "@/types/database";

export function useTasksLogic() {
  const { data: tasks, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [priority, setPriority] = useState("normal");

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dashboard?.couple?.id) return;

    try {
      await createTask.mutateAsync({
        couple_id: dashboard.couple.id,
        title: title.trim(),
        assigned_to: assignee === "unassigned" ? undefined : assignee,
        priority: priority,
      });
      toast.success("Task added");
      setIsAdding(false);
      setTitle("");
      setAssignee("unassigned");
      setPriority("normal");
    } catch (err) {
      toast.error("Failed to add task");
    }
  }

  function handleToggleStatus(task: any) {
    const newStatus: TaskStatus = task.status === "done" ? "pending" : "done";
    updateStatus.mutate({ id: task.id, status: newStatus });
  }

  const pendingTasks = tasks?.filter(t => t.status !== "done") || [];
  const completedTasks = tasks?.filter(t => t.status === "done") || [];

  return {
    tasks,
    isLoading,
    createTask,
    updateStatus,
    deleteTask,
    dashboard,
    isAdding,
    setIsAdding,
    title,
    setTitle,
    assignee,
    setAssignee,
    priority,
    setPriority,
    myProfile,
    partnerProfile,
    handleSubmit,
    handleToggleStatus,
    pendingTasks,
    completedTasks,
  };
}

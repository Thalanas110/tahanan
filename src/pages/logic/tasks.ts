import { useState } from "react";
import { useTasks, useCreateTask, useUpdateTaskStatus, useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus } from "@/types/database";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { getMyMember, getPartnerMember } from "@/lib/roomParticipants";

function isTaskPriority(value: string): value is TaskPriority {
  return value === "low" || value === "normal" || value === "high";
}

export function useTasksLogic() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { data: tasks, isLoading } = useTasks(activeRoomId, activeRoomType);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [priority, setPriority] = useState<TaskPriority>("normal");

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setTitle("");
    setAssignee("unassigned");
    setPriority("normal");
  };

  function handleEdit(task: any) {
    setEditingId(task.id);
    setTitle(task.title);
    setAssignee(task.assigned_to || "unassigned");
    setPriority(task.priority || "normal");
    setIsAdding(true);
  }

  const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
  const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !activeRoomId) return;

    try {
      if (editingId) {
        await updateTask.mutateAsync({
          id: editingId,
          title: title.trim(),
          assigned_to: assignee === "unassigned" ? null : assignee,
          priority,
        });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync({
          roomId: activeRoomId!,
          roomType: activeRoomType,
          title: title.trim(),
          assigned_to: assignee === "unassigned" ? undefined : assignee,
          priority,
        });
        toast.success("Task added");
      }
      resetForm();
    } catch (err) {
      toast.error(editingId ? "Failed to update task" : "Failed to add task");
    }
  }

  function handleToggleStatus(task: any) {
    const newStatus: TaskStatus = task.status === "done" ? "pending" : "done";
    updateStatus.mutate({ id: task.id, status: newStatus });
  }

  function handlePriorityChange(value: string) {
    if (!isTaskPriority(value)) return;
    setPriority(value);
  }

  const pendingTasks = tasks?.filter(t => t.status !== "done") || [];
  const completedTasks = tasks?.filter(t => t.status === "done") || [];

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    updateStatus,
    deleteTask,
    roomMembers,
    dashboard,
    isAdding,
    setIsAdding: (val: boolean) => {
      if (!val) resetForm();
      else setIsAdding(true);
    },
    editingId,
    title,
    setTitle,
    assignee,
    setAssignee,
    priority,
    setPriority: handlePriorityChange,
    myProfile,
    partnerProfile,
    handleSubmit,
    handleEdit,
    handleToggleStatus,
    pendingTasks,
    completedTasks,
  };
}

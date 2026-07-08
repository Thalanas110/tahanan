import { useTasksLogic } from "./logic/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, CheckSquare, Clock, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

export default function Tasks() {
  const {
    isLoading,
    createTask,
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
  } = useTasksLogic();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Tasks</h1>
          <p className="text-muted-foreground">Shared responsibilities and chores.</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        )}
      </header>

      {isAdding && (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>What needs to be done?</Label>
                <Input 
                  placeholder="e.g., Buy groceries, Call landlord" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Anyone</SelectItem>
                      {myProfile && <SelectItem value={myProfile.id}>Me ({myProfile.display_name})</SelectItem>}
                      {partnerProfile && <SelectItem value={partnerProfile.id}>{partnerProfile.display_name}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" /> To Do ({pendingTasks.length})
            </h2>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-dashed text-center">All caught up!</p>
            ) : (
              <ul className="space-y-2">
                {pendingTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={() => handleToggleStatus(task)} 
                    onDelete={() => deleteTask.mutate(task.id)}
                    members={dashboard?.members}
                  />
                ))}
              </ul>
            )}
          </div>

          {completedTasks.length > 0 && (
            <div className="space-y-3 opacity-70">
              <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-muted-foreground" /> Completed
              </h2>
              <ul className="space-y-2">
                {completedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={() => handleToggleStatus(task)} 
                    onDelete={() => deleteTask.mutate(task.id)}
                    members={dashboard?.members}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, members }: { task: any, onToggle: () => void, onDelete: () => void, members: any }) {
  const isDone = task.status === "done";
  const assigneeName = members?.find((m: any) => m.user_id === task.assigned_to)?.profiles?.display_name;

  return (
    <Card className={`transition-colors ${isDone ? 'bg-muted/50' : 'bg-card'}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <button 
          onClick={onToggle}
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
        >
          {isDone ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Circle className="w-6 h-6" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </p>
          {(assigneeName || task.priority === 'high') && (
            <div className="flex gap-2 mt-1 text-xs">
              {assigneeName && (
                <span className="bg-secondary/10 text-secondary-foreground px-2 py-0.5 rounded-sm">
                  {assigneeName}
                </span>
              )}
              {task.priority === 'high' && (
                <span className="text-destructive font-semibold">High Priority</span>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

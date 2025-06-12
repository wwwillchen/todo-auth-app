
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, UpdateTaskInput, AuthResponse, LoginInput, RegisterInput } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Filters
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [authForm, setAuthForm] = useState<LoginInput & { confirmPassword?: string }>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [taskForm, setTaskForm] = useState<CreateTaskInput>({
    title: '',
    description: null,
    priority: 'medium',
    due_date: null
  });

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Load user profile and tasks on mount
  useEffect(() => {
    if (token) {
      loadUserProfile();
      loadTasks();
    }
  }, [token]);

  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await trpc.getUserProfile.query();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Invalid token, clear it
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const filters: { completed?: boolean; priority?: 'low' | 'medium' | 'high'; search?: string } = {};
      
      if (filter === 'pending') filters.completed = false;
      if (filter === 'completed') filters.completed = true;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (searchTerm) filters.search = searchTerm;

      const result = await trpc.getTasks.query(filters);
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [filter, priorityFilter, searchTerm]);

  // Reload tasks when filters change
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  const handleAuth = async (isRegister: boolean) => {
    setIsLoading(true);
    try {
      let response: AuthResponse;
      
      if (isRegister) {
        if (authForm.password !== authForm.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
        const registerData: RegisterInput = {
          email: authForm.email,
          password: authForm.password
        };
        response = await trpc.register.mutate(registerData);
      } else {
        const loginData: LoginInput = {
          email: authForm.email,
          password: authForm.password
        };
        response = await trpc.login.mutate(loginData);
      }

      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      
      // Reset form
      setAuthForm({ email: '', password: '', confirmPassword: '' });
    } catch (error) {
      console.error(`${isRegister ? 'Registration' : 'Login'} failed:`, error);
      alert(`${isRegister ? 'Registration' : 'Login'} failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTasks([]);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newTask = await trpc.createTask.mutate(taskForm);
      setTasks((prev: Task[]) => [newTask, ...prev]);
      setTaskForm({
        title: '',
        description: null,
        priority: 'medium',
        due_date: null
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (updates: Partial<UpdateTaskInput>) => {
    if (!editingTask) return;
    
    try {
      const updateData: UpdateTaskInput = {
        id: editingTask.id,
        ...updates
      };
      const updatedTask = await trpc.updateTask.mutate(updateData);
      setTasks((prev: Task[]) => prev.map((task: Task) => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updateData: UpdateTaskInput = {
        id: task.id,
        completed: !task.completed
      };
      const updatedTask = await trpc.updateTask.mutate(updateData);
      setTasks((prev: Task[]) => prev.map((t: Task) => 
        t.id === updatedTask.id ? updatedTask : t
      ));
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate({ id: taskId });
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Authentication UI
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">📝 Todo App</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); handleAuth(false); }}>
                  <div className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={authForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={authForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); handleAuth(true); }}>
                  <div className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={authForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={authForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={6}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={authForm.confirmPassword || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      required
                      minLength={6}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Registering...' : 'Register'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">📝 My Tasks</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Task Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Task title"
                  value={taskForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTaskForm((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
                <Select 
                  value={taskForm.priority} 
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    setTaskForm((prev: CreateTaskInput) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                placeholder="Description (optional)"
                value={taskForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setTaskForm((prev: CreateTaskInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={taskForm.due_date ? new Date(taskForm.due_date).toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTaskForm((prev: CreateTaskInput) => ({ 
                      ...prev, 
                      due_date: e.target.value ? new Date(e.target.value) : null
                    }))
                  }
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : '✅ Create Task'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={filter} onValueChange={(value: 'all' | 'pending' | 'completed') => setFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setPriorityFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">🟢 Low Priority</SelectItem>
                  <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="high">🔴 High Priority</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No tasks found. Create your first task above!</p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task: Task) => (
              <Card key={task.id} className={`${task.completed ? 'bg-gray-50' : 'bg-white'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h3>
                        <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                          {task.priority}
                        </Badge>
                        {task.completed && (
                          <Badge variant="secondary">✅ Completed</Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created: {task.created_at.toLocaleDateString()}</span>
                        {task.due_date && (
                          <span className={`${new Date(task.due_date) < new Date() && !task.completed ? 'text-red-500 font-semibold' : ''}`}>
                            Due: {task.due_date.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTask(task)}
                      >
                        ✏️ Edit
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            🗑️
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Task</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{task.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <AlertDialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Task</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Task title"
                value={editingTask.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingTask((prev: Task | null) => prev ? { ...prev, title: e.target.value } : null)
                }
              />
              
              <Select 
                value={editingTask.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') =>
                  setEditingTask((prev: Task | null) => prev ? { ...prev, priority: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
              
              <Textarea
                placeholder="Description (optional)"
                value={editingTask.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditingTask((prev: Task | null) => prev ? { 
                    ...prev, 
                    description: e.target.value || null 
                  } : null)
                }
                rows={3}
              />
              
              <Input
                type="date"
                value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingTask((prev: Task | null) => prev ? { 
                    ...prev, 
                    due_date: e.target.value ? new Date(e.target.value) : null
                  } : null)
                }
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUpdateTask({
                title: editingTask.title,
                description: editingTask.description,
                priority: editingTask.priority,
                due_date: editingTask.due_date
              })}>
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default App;

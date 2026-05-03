import { listTasks, createTask, deleteTask, updateTask } from '../services/tasksService.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const getTasks = asyncHandler(async (req, res) => {
  const tasks = await listTasks(req.user.id)
  res.json({ data: tasks })
})

export const postTask = asyncHandler(async (req, res) => {
  const task = await createTask(req.user.id, req.body)
  res.status(201).json({ data: task })
})

export const patchTask = asyncHandler(async (req, res) => {
  const task = await updateTask(req.user.id, req.params.id, req.body)
  res.json({ data: task })
})

export const removeTask = asyncHandler(async (req, res) => {
  const result = await deleteTask(req.user.id, req.params.id)
  if (!result.deleted) {
    const error = new Error('Task not found')
    error.statusCode = 404
    error.code = 'TASK_NOT_FOUND'
    throw error
  }

  res.status(204).send()
})

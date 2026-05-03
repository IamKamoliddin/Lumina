import { createSubject, deleteSubject, listSubjects, updateSubject } from '../services/subjectsService.js'

export const getSubjects = async (req, res) => {
  const subjects = await listSubjects(req.user.id)
  res.json({ data: subjects })
}

export const postSubject = async (req, res) => {
  const subject = await createSubject(req.user.id, req.validated.body)
  res.status(201).json({ data: subject })
}

export const putSubject = async (req, res) => {
  const subject = await updateSubject(req.user.id, req.validated.params.id, req.validated.body)
  res.json({ data: subject })
}

export const removeSubject = async (req, res) => {
  await deleteSubject(req.user.id, req.validated.params.id)
  res.status(204).send()
}

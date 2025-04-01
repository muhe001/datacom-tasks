'use client'

import React from 'react'
import { Modal } from 'antd'
import { useDeleteTaskItemMutation } from './taskItemHooks'

function DeleteModal({
  isOpen,
  entityName,
  name,
  isLoading,
  onDeleteButtonClick,
  onCancel,
}) {
  return (
    <Modal
      title={`Delete ${name}`}
      open={Boolean(isOpen)}
      okText={`Delete ${name}`}
      onOk={onDeleteButtonClick}
      onCancel={onCancel}
      okButtonProps={{
        loading: isLoading,
        danger: true,
      }}
    >
      Are you sure you want to delete the
      {' '}
      <strong>{entityName}</strong>
      :
      {' '}
      <strong>{name}</strong>
      ?
    </Modal>
  )
}

export default function TaskItemDeleteModal({ taskItem, onCancel, onDelete }) {
  const deleteMutation = useDeleteTaskItemMutation()

  async function onDeleteButtonClick() {
    const listId = taskItem.listId.split(':')[1]
    await deleteMutation.mutateAsync({ listId, itemId: taskItem.itemId })
    onDelete()
  }

  return (
    <DeleteModal
      isOpen={taskItem}
      entityName='TaskItem'
      name={taskItem?.title}
      isLoading={deleteMutation.isLoading}
      onDeleteButtonClick={onDeleteButtonClick}
      onCancel={onCancel}
    />
  )
}

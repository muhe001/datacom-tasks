'use client'

import React, { useState } from 'react'
import {
  Button,
  Card,
  Skeleton,
  Space,
} from 'antd'
import TaskItemUpsertModal from './TaskItemUpsertModal'
import TaskItemData from './TaskItemData'
import AvatarNameLink from '../AvatarNameLink'

export default function TaskItemDetails({
  listId,
  taskItem,
}) {
  return (
    <Space size='large' direction='vertical' style={{width: '100%'}}>
      <TaskItemDetailsDetails
        listId={listId}
        taskItem={taskItem}
      />
    </Space>
  )
}

function TaskItemDetailsDetails({
  listId,
  taskItem,
}) {
  const [isUpsertModalVisible, setIsUpsertModalVisible] = useState(false)
  if (!taskItem) return <Skeleton />

  function showUpsertModal() {
    setIsUpsertModalVisible(true)
  }

  return (
    <Card
      bordered={false}
      title={(
        <AvatarNameLink
          image={taskItem.image}
          imageAlt='Image'
          name={taskItem.title}
          avatarProps={{size: 'large'}}
        />
      )}
      extra={(
        <Button type='primary' onClick={showUpsertModal}>
          Edit
        </Button>
      )}
    >
      <TaskItemUpsertModal
        isOpen={isUpsertModalVisible}
        setIsOpen={setIsUpsertModalVisible}
        taskItem={taskItem}
        listId={taskItem.listId}
      />
      <TaskItemData taskItem={taskItem} />
    </Card>
  )
}

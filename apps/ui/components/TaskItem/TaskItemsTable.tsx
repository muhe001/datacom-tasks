'use client'

import React, { useState } from 'react'
import { Button, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useListTaskItemsQuery, type TaskItemData } from './taskItemHooks'
import TaskItemUpsertModal from './TaskItemUpsertModal'
import TaskItemDeleteModal from './TaskItemDeleteModal'
import AvatarNameLink from '../AvatarNameLink'
import { usePagination } from '../../lib/usePagination'
import { DEFAULT_PAGE_SIZE } from '@repo/common'

export default function TaskItemsTable({...restProps }) {
  const [selectedForEdit, setSelectedForEdit] = useState<any | null>()
  const [selectedForDelete, setSelectedForDelete] = useState<any | null>()
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [previousPage, setPreviousPage] = useState<any | null>()
  const tskItemsQuery = useListTaskItemsQuery({
    page: currentPageIndex,
    lastEvaluatedKey: previousPage?.lastEvaluatedKey,
  })
  const { pages, totalPagedItemsPlusOneIfHasMorePages } = usePagination({
    items: tskItemsQuery?.data?.data,
    lastEvaluatedKey: tskItemsQuery?.data?.lastEvaluatedKey,
    currentPageIndex,
  })

  const columns: ColumnsType<TaskItemData> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render(title, taskItem) {
        const { itemId } = taskItem
        const text = title || itemId
        return (
          <AvatarNameLink
            name={text}
            image={taskItem.image}
            imageAlt="Image"
            avatarProps={{
              size: 30,
              style: { minWidth: 30 },
            }}
          />
        )
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
    {
      title: '',
      key: 'actionButtons',
      align: 'right',
      width: 100,
      render(text, taskItem) {
        return (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setSelectedForEdit(taskItem)} />
            <Button icon={<DeleteOutlined />} onClick={() => setSelectedForDelete(taskItem)} danger />
          </Space>
        )
      },
    },
  ]

  function onPaginate(pageNumber) {
    const pageNumberIndex = pageNumber - 1
    setPreviousPage(pages[pageNumberIndex - 1])
    setCurrentPageIndex(pageNumberIndex)
  }

  return (
    <>
      <TaskItemUpsertModal
        isOpen={Boolean(selectedForEdit)}
        setIsOpen={() => setSelectedForEdit(null)}
        taskItem={selectedForEdit}
      />
      <TaskItemDeleteModal
        onDelete={() => setSelectedForDelete(null)}
        onCancel={() => setSelectedForDelete(null)}
        taskItem={selectedForDelete}
      />
      <Table
        loading={tskItemsQuery.isLoading}
        dataSource={tskItemsQuery.data?.data}
        rowKey="itemId"
        size="small"
        columns={columns}
        pagination={{
          position: ['bottomRight'],
          pageSize: DEFAULT_PAGE_SIZE,
          onChange: onPaginate,
          total: totalPagedItemsPlusOneIfHasMorePages,
        }}
        // scroll={{ x: 800 }}
        {...restProps}
      />
      <style jsx global>{`
        .ant-table-wrapper .ant-table.ant-table-small .ant-table-tbody .ant-table-wrapper:only-child .ant-table {
          margin: 0;
        }
      `}</style>
    </>
  )
}

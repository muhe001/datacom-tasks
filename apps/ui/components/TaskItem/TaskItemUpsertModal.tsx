'use client'

import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { UploadOutlined } from '@ant-design/icons'
import {
  Button,
  Form,
  Modal,
  DatePicker,
  Input,
  Select,
  Upload,
} from 'antd'
import { useCreateTaskItemMutation, useUpdateTaskItemMutation } from './taskItemHooks'
import { beforeUpload, customRequest, handleUploadChange } from '../../lib/upload'

const DEFAULT_VALUES = {
  status: 'ToDo',
}

interface TaskItemUpsertModalParams {
  isOpen: boolean
  taskItem?: any
  setIsOpen: any
}

export default function TaskItemUpsertModal({ isOpen, taskItem, setIsOpen }: TaskItemUpsertModalParams) {
  const isEdit = Boolean(taskItem)
  const useUpsertMutation = isEdit ? useUpdateTaskItemMutation : useCreateTaskItemMutation
  const upsertTaskItemMutation = useUpsertMutation()

  function onCancel() {
    setIsOpen(false)
  }

  return (
    <Modal
      centered
      title="Task Item"
      open={isOpen}
      destroyOnClose
      onCancel={onCancel}
      footer={[
        <Button key="cancel" disabled={upsertTaskItemMutation.isLoading} onClick={onCancel}>
          Cancel
        </Button>,
        <Button type="primary" form="taskItem" key="submit" htmlType="submit" loading={upsertTaskItemMutation.isLoading}>
          {isEdit ? 'Update Task item' : 'Create Task item'}
        </Button>,
      ]}
    >
      <TaskItemUpsertForm
        taskItem={taskItem}
        onEdit={() => setIsOpen(false)}
        upsertTaskItemMutation={upsertTaskItemMutation}
      />
    </Modal>
  )
}

function TaskItemUpsertForm({
  taskItem,
  onEdit,
  upsertTaskItemMutation
}) {
  const isEdit = Boolean(taskItem)
  const [taskItemForm] = Form.useForm()
  const [logoBase64Encoded, setLogoBase64Encoded] = useState<string>()

  const uploadButton = (
    <div>
      <UploadOutlined style={{ fontSize: 24 }} />
    </div>
  )

  // When editing multiple records on the same page, we need to call resetFields,
  // otherwise the form lags behind, showing the previously selected record's values.
  // https://github.com/ant-design/ant-design/issues/22372
  useEffect(() => {
    taskItemForm.resetFields()

    if (isEdit) {
      setLogoBase64Encoded(taskItem.image)
    }
  }, [taskItem])

  async function submitForm() {
    const formValues = await taskItemForm.validateFields()
    formValues.image = logoBase64Encoded
    const mutationData: any = {
      data: formValues,
    }

    if (isEdit) {
      mutationData.itemId = taskItem.itemId
    }

    const response = await upsertTaskItemMutation.mutateAsync(mutationData)

    if (response) {
      onEdit()
    }
  }

  const initialValues =
    isEdit ?
      {
        ...DEFAULT_VALUES,
        ...taskItem,
    dueDate: taskItem.dueDate ? dayjs(new Date(taskItem.dueDate)) : undefined,
        image:
          taskItem.image ?
            {
              uid: '1',
              status: 'done',
              url: taskItem.image,
            }
          : undefined,
      }
    : DEFAULT_VALUES

  return (
    <Form
      name="taskItem"
      preserve={false}
      initialValues={initialValues}
      form={taskItemForm}
      onFinish={submitForm}
      layout="vertical"
      disabled={upsertTaskItemMutation.isLoading}
    >
      <Form.Item
        label="Title"
        name="title"
        rules={[
          {
            required: true,
            message: 'Required.',
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Description"
        name="description"
      >
        <Input.TextArea showCount autoSize={{ minRows: 2 }} />
      </Form.Item>
      <Form.Item
        label="Status"
        name="status"
      >
        <Select showSearch>
          <Select.Option value="ToDo">To Do</Select.Option>
          <Select.Option value="InProgress">In Progress</Select.Option>
          <Select.Option value="Completed">Completed</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="Due Date"
        name="dueDate"
      >
        <DatePicker />
      </Form.Item>
      <Form.Item
        label="Image"
        name="image"
        valuePropName="filesList"
      >
        <Upload
          name="image"
          listType="picture-circle"
          accept=".png, .jpg"
          showUploadList={{ showPreviewIcon: false }}
          customRequest={customRequest}
          beforeUpload={beforeUpload}
          onChange={(info) => handleUploadChange({ info, setLogoBase64Encoded })}
          defaultFileList={initialValues?.image ? [initialValues.image] : undefined}
        >
          {!logoBase64Encoded && uploadButton}
        </Upload>
      </Form.Item>
    </Form>
  )
}

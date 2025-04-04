import React, { useState } from 'react'
import { Select, Spin } from 'antd'
import type { SelectProps } from 'antd/es/select'
import debounce from 'lodash.debounce'
import AvatarNameLink from '../AvatarNameLink'
import { useSearchTaskItemsQuery } from './taskItemHooks'

export interface SelectTaskItemParams<ValueType = any> extends Omit<SelectProps<ValueType | ValueType[]>, 'options' | 'children'> {
  debounceTimeout?: number
  multiple?: boolean
  listId: string
}

interface KeyLabel {
  key?: string
  label: React.ReactNode
  value: string | number
}

export function SelectTaskItem<ValueType extends KeyLabel = any>({
  debounceTimeout = 360,
  multiple = false,
  listId,
  ...props
}: SelectTaskItemParams<ValueType>) {
  const [searchValue, setSearchValue] = useState<string>()
  const searchTaskItemsQuery = useSearchTaskItemsQuery({ listId, title: searchValue })
  const searchTaskItemsQueryData = searchTaskItemsQuery?.data?.data ?? []
  const taskItemOptions = (
    <>
      <Select.Option value={null} label="None">
        <em>None</em>
      </Select.Option>
      {searchTaskItemsQueryData.map((taskItem) => (
        <Select.Option key={taskItem.itemId} value={taskItem.itemId} label={taskItem.title}>
          <AvatarNameLink
            avatarProps={{ size: 30, style: { minWidth: 30 } }}
            image={taskItem.image}
            imageAlt="Image"
            name={taskItem.title}
          />
        </Select.Option>
      ))}
    </>
  )

  const debouncedSetSearchValue = debounce((v: string) => {
    setSearchValue(v)
  }, debounceTimeout)

  const notFoundContent = (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      {searchTaskItemsQuery?.isFetching ?
        <span>
          <Spin />
          <span style={{ paddingLeft: '1rem' }}>Searching for Task items...</span>
        </span>
      : 'No Task items found'}
    </div>
  )

  return (
    <Select
      mode={multiple ? 'multiple' : undefined}
      showSearch
      optionFilterProp="children"
      filterOption={(input, option) => (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
      filterSort={(optionA, optionB) =>
        optionB?.value === null ?
          1
        : (optionA?.label?.toString() ?? '').toLowerCase().localeCompare((optionB?.label?.toString() ?? '').toLowerCase())
      }
      loading={searchTaskItemsQuery?.isFetching}
      notFoundContent={notFoundContent}
      onSearch={debouncedSetSearchValue}
      {...props}
    >
      {taskItemOptions}
    </Select>
  )
}

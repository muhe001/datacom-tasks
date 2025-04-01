'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { Breadcrumb } from 'antd'
import { HomeOutlined, AppstoreOutlined } from '@ant-design/icons'
import getPageTitle from '../../lib/getPageTitle'
import AuthenticatedPage from '../../components/layouts/AuthenticatedPage'
import {
  Button,
  Card,
  Skeleton,
  Space,
} from 'antd'
import TaskItemsTable from '../../components/TaskItem/TaskItemsTable'
import TaskItemUpsertModal from '../../components/TaskItem/TaskItemUpsertModal'

export default function TaskListDetailsPage() {
  return (
    <AuthenticatedPage>
      <Head>
        <title>{getPageTitle({ pageTitle: 'Tasks' })}</title>
      </Head>
      <Breadcrumb items={[
        {
          title: <Link href='/' passHref><HomeOutlined /></Link>,
        }
      ]} />
      <div className='detailsContainer'>
        <TaskItems/>
      </div>
      <style jsx>
        {`
        .detailsContainer {
          margin-top: 1rem;
        }
        `}
      </style>
    </AuthenticatedPage>
  )
}

export function TaskItems({
}) {
  const [isUpsertModalVisible, setIsUpsertModalVisible] = useState(false)

  function showUpsertModal() {
    setIsUpsertModalVisible(true)
  }

  return (
    <Card
      bordered={false}
      title='Task items'
      extra={(
        <Button type='primary' onClick={showUpsertModal}>
          Create Task Item
        </Button>
      )}
      className='cardWithTableBody'
    >
      <TaskItemUpsertModal
        isOpen={isUpsertModalVisible}
        setIsOpen={setIsUpsertModalVisible}
      />
      <TaskItemsTable/>
      <style jsx global>{`
        .cardWithTableBody .ant-card-body {
          padding: 0;
          overflow: auto;
        }
      `}</style>
    </Card>
  )
}

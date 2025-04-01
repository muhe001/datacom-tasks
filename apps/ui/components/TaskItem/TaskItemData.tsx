'use client'

import React from 'react'
import { Col, Row } from 'antd'

export default function TaskItemData({ taskItem, minColSpan = 12 }) {
  const colSpans = {
    xs: Math.max(minColSpan, 24),
    sm: Math.max(minColSpan, 12),
    xl: Math.max(minColSpan, 8),
  }
  return (
    <Row gutter={[48, 24]}>
      <Col {...colSpans}>
        <div>
          <strong>Status</strong>
        </div>
        <div>{taskItem.status}</div>
      </Col>
      <Col {...colSpans}>
        <div>
          <strong>Due Date</strong>
        </div>
        <div>{taskItem.dueDate}</div>
      </Col>
      <Col xs={24}>
        <div>
          <strong>Description</strong>
        </div>
        <div style={{ whiteSpace: 'pre-line' }}>{taskItem.description}</div>
      </Col>
      <Col xs={24}>
        <div>
          <strong>Image</strong>
        </div>
        {taskItem.image ? (
          <div style={{ textAlign: 'center' }}>
            <img src={taskItem.image} style={{ maxWidth: '100%' }} />
          </div>
        ) : (
          <em>None</em>
        )}
      </Col>
    </Row>
  )
}

'use client'

import React, { useContext } from 'react'
import { BgColorsOutlined, AppstoreOutlined } from '@ant-design/icons'
import { Button, Menu } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMeQuery } from '../Me/meHooks'
import AvatarNameLink from '../AvatarNameLink'
import { ThemeContext } from '../../themes/theme-provider'
import type { ItemType, MenuItemType } from 'antd/es/menu/hooks/useItems'

export default function SideMenu() {
  const router = useRouter()
  const meQuery = useMeQuery()
  const { theme, setTheme } = useContext<any>(ThemeContext)

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const me = meQuery?.data?.data
  const items: ItemType<MenuItemType>[] = [
    {
      key: 'taskItems',
      icon: <AppstoreOutlined />,
      label: <Link href="/task-items">Tasks</Link>,
    },
    {
      key: '_spacer',
      type: 'divider',
      style: { flex: 1, border: 0 },
    },
    {
      key: '_logout-theme-switcher',
      style: {
        pointerEvents: 'none',
      },
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button shape="circle" icon={<BgColorsOutlined />} onClick={toggleTheme} style={{ pointerEvents: 'auto' }} />
        </div>
      ),
    },
    {
      key: '_bottom-divider',
      type: 'divider',
    },
    {
      key: 'account',
      label: (
        <AvatarNameLink
          linkRoute="/account"
          image={me?.profilePicture}
          imageAlt="Profile Picture"
          name={me?.name || 'My Account'}
          avatarProps={{ size: 'small' }}
        />
      ),
    },
  ]
  const selectedKey = getSelectedKey(router.pathname)

  return (
    <Menu
      defaultSelectedKeys={[selectedKey]}
      selectedKeys={[selectedKey]}
      mode="inline"
      theme={theme}
      items={items}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    />
  )
}

function getSelectedKey(pathName) {
  const pathNameSplit = pathName?.split('/')

  return pathNameSplit?.[1] || ''
}

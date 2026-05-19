import React from 'react'
import Logo from '../assets/logo-wordmark.svg'

type Props = {
  color?: string
}

export default function VaultaLogo({ color }: Props) {
  return <Logo width={280} height={57} color={color} />
}

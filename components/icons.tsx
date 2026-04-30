// Antd icon re-exports, matching legacy I.xxx API surface.
// Each entry wraps the antd icon to accept the same { size?: number } prop
// that the original Lucide-style icons used.
import React from 'react';
import type { SVGProps } from 'react';
import {
  UploadOutlined,
  FileOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  CloseOutlined,
  CheckOutlined,
  UserOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  SunOutlined,
  MoonOutlined,
  AppstoreOutlined,
  BarsOutlined,
  EllipsisOutlined,
  RightOutlined,
  LeftOutlined,
  DownOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DiffOutlined,
  HomeOutlined,
  AimOutlined,
  BankOutlined,
  ReadOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  TagOutlined,
  SettingOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  DownloadOutlined,
  BellOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function wrap(AntIcon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>) {
  return ({ size = 20, style, ...rest }: IconProps) => (
    <AntIcon style={{ fontSize: size, ...style }} {...(rest as any)} />
  );
}

export const I = {
  Upload:    wrap(UploadOutlined),
  File:      wrap(FileOutlined),
  Search:    wrap(SearchOutlined),
  Filter:    wrap(FilterOutlined),
  Sort:      wrap(SortAscendingOutlined),
  X:         wrap(CloseOutlined),
  Check:     wrap(CheckOutlined),
  User:      wrap(UserOutlined),
  Users:     wrap(TeamOutlined),
  Sparkles:  wrap(ThunderboltOutlined),
  Sun:       wrap(SunOutlined),
  Moon:      wrap(MoonOutlined),
  Grid:      wrap(AppstoreOutlined),
  List:      wrap(BarsOutlined),
  MoreH:     wrap(EllipsisOutlined),
  ChevR:     wrap(RightOutlined),
  ChevL:     wrap(LeftOutlined),
  ChevD:     wrap(DownOutlined),
  Plus:      wrap(PlusOutlined),
  Edit:      wrap(EditOutlined),
  Trash:     wrap(DeleteOutlined),
  Compare:   wrap(DiffOutlined),
  Home:      wrap(HomeOutlined),
  Target:    wrap(AimOutlined),
  Briefcase: wrap(BankOutlined),
  School:    wrap(ReadOutlined),
  Mail:      wrap(MailOutlined),
  Phone:     wrap(PhoneOutlined),
  MapPin:    wrap(EnvironmentOutlined),
  Tag:       wrap(TagOutlined),
  Settings:  wrap(SettingOutlined),
  Eye:       wrap(EyeOutlined),
  ArrowR:    wrap(ArrowRightOutlined),
  Download:  wrap(DownloadOutlined),
  Bell:      wrap(BellOutlined),
  Clock:     wrap(ClockCircleOutlined),
  LogOut:    wrap(LogoutOutlined),
};

import { describe, it, expect } from 'vitest'
import { toSecid, toTencentCode } from '@/api/eastmoney'

describe('toSecid - 市场判定', () => {
  it('已是 secid 格式直接返回', () => {
    expect(toSecid('1.600519')).toBe('1.600519')
    expect(toSecid('0.000858')).toBe('0.000858')
    expect(toSecid('90.880301')).toBe('90.880301')
  })

  it('带市场前缀优先识别（消歧 000xxx）', () => {
    // 这是核心修复：纯代码无法区分 000001 是上证指数还是平安银行，必须靠前缀
    expect(toSecid('SH000001')).toBe('1.000001') // 上证指数
    expect(toSecid('SZ000001')).toBe('0.000001') // 平安银行（深市）
    expect(toSecid('SH600519')).toBe('1.600519') // 茅台
    expect(toSecid('SZ000858')).toBe('0.000858') // 五粮液（深市主板）
    expect(toSecid('SZ300750')).toBe('0.300750') // 宁德时代（创业板）
  })

  it('深市主板 000xxx 纯代码默认走深市（不再误判沪市）', () => {
    // P0 修复前：000xxx 全部返回 1.（沪市），导致五粮液/万科/平安银行查询错误
    expect(toSecid('000858')).toBe('0.000858') // 五粮液
    expect(toSecid('000002')).toBe('0.000002') // 万科A
    expect(toSecid('000063')).toBe('0.000063') // 中兴通讯
  })

  it('上证核心指数 000xxx 仍识别为沪市', () => {
    expect(toSecid('000300')).toBe('1.000300') // 沪深300
    expect(toSecid('000016')).toBe('1.000016') // 上证50
    expect(toSecid('000905')).toBe('1.000905') // 中证500
  })

  it('沪市主板 6xx / 创业板 3xx / 北交所', () => {
    expect(toSecid('600519')).toBe('1.600519') // 茅台 沪市
    expect(toSecid('601318')).toBe('1.601318') // 平安 沪市
    expect(toSecid('300750')).toBe('0.300750') // 宁德 创业板(深)
    expect(toSecid('830799')).toBe('0.830799') // 北交所(东财市场号0)
    expect(toSecid('920002')).toBe('0.920002') // 北交所920段
  })

  it('概念板块 880xxx 走板块市场号 90.', () => {
    expect(toSecid('880301')).toBe('90.880301')
  })

  it('深证指数 399xxx 走深市', () => {
    expect(toSecid('399006')).toBe('0.399006') // 创业板指
    expect(toSecid('399001')).toBe('0.399001') // 深证成指
  })

  it('空/非法输入', () => {
    expect(toSecid('')).toBe('')
    expect(toSecid(null)).toBe('')
  })
})

describe('toTencentCode - 腾讯码转换', () => {
  it('A股/指数/北交所前缀', () => {
    expect(toTencentCode('SH600519')).toBe('sh600519')
    expect(toTencentCode('SZ000858')).toBe('sz000858')
    expect(toTencentCode('SH000001')).toBe('sh000001') // 指数
    expect(toTencentCode('SZ399006')).toBe('sz399006') // 深证指数
    expect(toTencentCode('830799')).toBe('bj830799') // 北交所
  })
})

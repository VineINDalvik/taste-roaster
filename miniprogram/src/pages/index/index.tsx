import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const MBTI_EXAMPLES = [
  { type: 'INTJ', desc: '理性主义审美建筑师' },
  { type: 'ENFP', desc: '浪漫主义杂食探险家' },
  { type: 'INFJ', desc: '孤独的灵魂考古者' },
  { type: 'ISTP', desc: '冷感解构主义技术控' },
  { type: 'ENFJ', desc: '共情型文化布道者' },
  { type: 'INTP', desc: '赛博苦行僧' },
]

export default function IndexPage() {
  return (
    <View className='index-page'>
      {/* Hero */}
      <View className='hero animate-fade-in-up'>
        <Text className='brand'>豆瓣书影音 MBTI</Text>
        <View className='title-wrap'>
          <Text className='title'>你的品味</Text>
          <Text className='title-gradient'>是什么人格</Text>
        </View>
        <Text className='subtitle'>
          输入豆瓣 ID，AI 从你的书影音中{'\n'}推导你的 MBTI 类型——你是谁，一目了然
        </Text>
      </View>

      {/* CTA */}
      <View className='cta-wrap animate-fade-in-up animate-delay-200'>
        <View
          className='cta-btn accent-gradient pulse-glow'
          onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}
        >
          <Text className='cta-text'>测测我的书影音 MBTI</Text>
        </View>
      </View>

      {/* MBTI Examples */}
      <View className='examples animate-fade-in-up animate-delay-300'>
        <Text className='examples-label'>过往用户的书影音 MBTI...</Text>
        <View className='examples-grid'>
          {MBTI_EXAMPLES.map(ex => (
            <View key={ex.type} className='example-item card-glass'>
              <Text className='example-type'>{ex.type}</Text>
              <Text className='example-desc'>{ex.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* How it works */}
      <View className='how-it-works animate-fade-in-up animate-delay-300'>
        <View className='step'>
          <Text className='step-icon'>🔍</Text>
          <Text className='step-title'>输入 ID</Text>
          <Text className='step-desc'>豆瓣 ID 或链接{'\n'}智能读取数据</Text>
        </View>
        <View className='step'>
          <Text className='step-icon'>🧬</Text>
          <Text className='step-title'>AI 推导 MBTI</Text>
          <Text className='step-desc'>四维度逐一分析{'\n'}用作品作为证据</Text>
        </View>
        <View className='step'>
          <Text className='step-icon'>🎴</Text>
          <Text className='step-title'>生成报告</Text>
          <Text className='step-desc'>MBTI 卡片 + 深度解读{'\n'}一键分享</Text>
        </View>
      </View>

      {/* Privacy */}
      <View className='privacy-section animate-fade-in-up animate-delay-300'>
        <View className='privacy-card card-glass'>
          <Text className='privacy-icon'>🔒</Text>
          <Text className='privacy-title'>隐私承诺</Text>
          <Text className='privacy-item'>· 不存储任何豆瓣数据，分析完即销毁</Text>
          <Text className='privacy-item'>· 仅读取公开标记，不涉及私密信息</Text>
          <Text className='privacy-item'>· 所有数据仅在你的设备本地保存</Text>
        </View>
      </View>

      {/* Footer */}
      <View className='footer'>
        <Text className='footer-text'>由 AI 驱动 · 数据不留存 · 分析即焚</Text>
      </View>
    </View>
  )
}

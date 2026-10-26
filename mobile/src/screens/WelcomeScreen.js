// mobile/src/screens/WelcomeScreen.js
// 3-slide onboarding carousel. Matches web Gold/Amber brand colors.
// Fixed bottom button layout with react-native-safe-area-context.

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ★ FIXED IMPORT
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Web Brand Colors
const WEB_GOLD = '#EAB308';
const WEB_DARK_BG = '#0F172A'; 
const WEB_TEXT_MUTED = '#94A3B8';

const SLIDES = [
  {
    id: 'sales',
    icon: 'cart',
    iconColor: WEB_GOLD,
    title: 'Track Every Sale',
    subtitle: 'Record sales in seconds — even offline. Your business numbers stay accurate wherever you are.',
  },
  {
    id: 'inventory',
    icon: 'cube',
    iconColor: WEB_GOLD,
    title: 'Manage Inventory',
    subtitle: 'Know what is in stock, what is running low, and what is making you the most profit — at a glance.',
  },
  {
    id: 'insights',
    icon: 'sparkles',
    iconColor: WEB_GOLD,
    title: 'AI-Powered Insights',
    subtitle: 'Get daily revenue, profit, and cash flow reports with AI forecasts so you can grow with confidence.',
  },
];

export default function WelcomeScreen({ navigation }) {
  const { isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const bgColor = isDark ? WEB_DARK_BG : WEB_DARK_BG;

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex) setActiveIndex(index);
  };

  const goToSlide = (index) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveIndex(index);
  };

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'bottom']}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleGetStarted} style={styles.skipBtn}>
          <Text style={{ color: WEB_TEXT_MUTED, fontSize: 14, fontWeight: '600' }}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Brand header matching web */}
      <View style={styles.brandHeader}>
        <View style={styles.logoRow}>
          <Text style={styles.logoTextGold}>AI CFO</Text>
          <Text style={styles.logoTextEnterprise}>ENTERPRISE</Text>
        </View>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconCircle, { backgroundColor: WEB_GOLD + '15', borderColor: WEB_GOLD + '30', borderWidth: 1 }]}>
              <Ionicons name={slide.icon} size={56} color={WEB_GOLD} />
            </View>
            <Text style={[styles.slideTitle, { color: '#fff' }]}>{slide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: WEB_TEXT_MUTED }]}>
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots indicator */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => goToSlide(idx)}
            style={[
              styles.dot,
              {
                backgroundColor: idx === activeIndex ? WEB_GOLD : '#334155',
                width: idx === activeIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA button area with proper bottom padding */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: WEB_GOLD }]}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 8,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  logoTextGold: {
    fontSize: 32,
    fontWeight: '900',
    color: WEB_GOLD,
    letterSpacing: -0.5,
  },
  logoTextEnterprise: {
    fontSize: 14,
    fontWeight: '700',
    color: WEB_TEXT_MUTED,
    letterSpacing: 1,
  },
  slide: {
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
  },
  ctaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
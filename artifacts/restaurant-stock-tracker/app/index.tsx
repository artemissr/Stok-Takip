import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import {
  AREAS,
  Area,
  daysUntil,
  formatDate,
  Ingredient,
  RecipeIngredient,
  stockFor,
  today,
  useInventory,
} from '@/context/InventoryContext';

type Section = 'summary' | 'sales' | 'stock' | 'reports' | 'more';
type ModalType = 'ingredient' | 'shipment' | 'recipe' | 'return' | null;

const money = (value: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

const numberValue = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

function Icon({ name, size = 18, color = colors.light.primary }: { name: React.ComponentProps<typeof Feather>['name']; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warning' | 'success' | 'danger' }) {
  const palette = {
    neutral: { backgroundColor: colors.light.muted, color: colors.light.mutedForeground },
    warning: { backgroundColor: '#f7e4c9', color: '#a36222' },
    success: { backgroundColor: '#dcebe0', color: colors.light.primary },
    danger: { backgroundColor: '#f6ddd7', color: colors.light.destructive },
  }[tone];
  return <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}><Text style={[styles.pillText, { color: palette.color }]}>{children}</Text></View>;
}

function PrimaryButton({ label, icon, onPress, secondary = false, compact = false }: { label: string; icon?: React.ComponentProps<typeof Feather>['name']; onPress: () => void; secondary?: boolean; compact?: boolean }) {
  return (
    <Pressable
      testID={`button-${label}`}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress(); }}
      style={({ pressed }) => [styles.primaryButton, secondary && styles.secondaryButton, compact && styles.compactButton, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={compact ? 16 : 18} color={secondary ? colors.light.primary : colors.light.primaryForeground} /> : null}
      <Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText, compact && styles.compactButtonText]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? <Pressable onPress={onAction}><Text style={styles.linkText}>{action}</Text></Pressable> : null}
    </View>
  );
}

function EmptyState({ icon, title, copy }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; copy: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Icon name={icon} size={22} color={colors.light.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

function Dashboard({ onNavigate, onOpen }: { onNavigate: (section: Section) => void; onOpen: (type: Exclude<ModalType, null>) => void }) {
  const { ingredients, batches, recipes, sales } = useInventory();
  const expiring = batches.filter((batch) => batch.quantity > 0 && daysUntil(batch.expiryDate) <= 3).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const lowStock = ingredients.filter((ingredient) => stockFor(batches, ingredient.id) <= ingredient.threshold);
  const todaySales = sales.filter((sale) => sale.date === today()).reduce((sum, sale) => sum + sale.quantity, 0);
  const stockValue = ingredients.reduce((sum, ingredient) => sum + stockFor(batches, ingredient.id) * ingredient.buyPrice, 0);
  const ingredientName = (id: string) => ingredients.find((item) => item.id === id)?.name ?? 'Ürün';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>BUGÜN · {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date())}</Text>
          <Text style={styles.pageTitle}>Mutfak stoğu</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>MK</Text></View>
      </View>
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>Günün kontrolü sende.</Text>
          <Text style={styles.greetingCopy}>Kritik ürünleri gör, satışını gir, mutfağı rahatlat.</Text>
        </View>
        <View style={styles.leafBadge}><Icon name="sun" size={22} color={colors.light.accentForeground} /></View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, styles.metricCardGreen]}><Text style={styles.metricLabel}>STOK DEĞERİ</Text><Text style={styles.metricValue}>{money(stockValue)}</Text><Text style={styles.metricHint}>alış fiyatı üzerinden</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>BUGÜN SATIŞ</Text><Text style={styles.metricValue}>{todaySales}</Text><Text style={styles.metricHint}>porsiyon / ürün</Text></View>
        <View style={[styles.metricCard, expiring.length > 0 && styles.metricCardWarm]}><Text style={styles.metricLabel}>SKT YAKLAŞAN</Text><Text style={styles.metricValue}>{expiring.length}</Text><Text style={styles.metricHint}>3 gün içinde</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>SİPARİŞ LİSTESİ</Text><Text style={styles.metricValue}>{lowStock.length}</Text><Text style={styles.metricHint}>eşik altı ürün</Text></View>
      </View>

      <View style={styles.quickActions}>
        <PrimaryButton label="Satış gir" icon="plus" onPress={() => onNavigate('sales')} />
        <PrimaryButton label="Sevkiyat ekle" icon="package" onPress={() => onOpen('shipment')} secondary />
      </View>

      <SectionHeading title="SKT radar" action="Stokta gör" onAction={() => onNavigate('stock')} />
      {expiring.length === 0 ? <EmptyState icon="check-circle" title="Raflar güvende" copy="Önümüzdeki 3 günde sona erecek ürün yok." /> : (
        <View style={styles.cardList}>
          {expiring.slice(0, 4).map((batch) => {
            const days = daysUntil(batch.expiryDate);
            return <View style={styles.alertRow} key={batch.id}>
              <View style={[styles.alertDot, { backgroundColor: days <= 1 ? colors.light.destructive : '#d99045' }]} />
              <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{ingredientName(batch.ingredientId)}</Text><Text style={styles.rowMeta}>{batch.quantity.toFixed(1)} {ingredients.find((item) => item.id === batch.ingredientId)?.unit ?? ''} · {formatDate(batch.expiryDate)}</Text></View>
              <Pill tone={days <= 1 ? 'danger' : 'warning'}>{days <= 0 ? 'Bugün' : `${days} gün`}</Pill>
            </View>;
          })}
        </View>
      )}

      <SectionHeading title="Hızlı satış" action="Tümünü gör" onAction={() => onNavigate('sales')} />
      <View style={styles.cardList}>
        {recipes.slice().sort((a, b) => {
          const aCount = sales.filter((sale) => sale.recipeId === a.id).reduce((sum, sale) => sum + sale.quantity, 0);
          const bCount = sales.filter((sale) => sale.recipeId === b.id).reduce((sum, sale) => sum + sale.quantity, 0);
          return bCount - aCount;
        }).slice(0, 3).map((recipe) => {
          const sold = sales.filter((sale) => sale.recipeId === recipe.id).reduce((sum, sale) => sum + sale.quantity, 0);
          return <View style={styles.menuRow} key={recipe.id}><View style={styles.menuIcon}><Icon name={recipe.name.includes('white') ? 'coffee' : 'layers'} size={18} color={colors.light.primary} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{recipe.name}</Text><Text style={styles.rowMeta}>{sold} satış · {money(recipe.salePrice)}</Text></View><Pressable style={styles.circleAdd} onPress={() => onNavigate('sales')}><Icon name="plus" size={18} color={colors.light.primaryForeground} /></Pressable></View>;
        })}
      </View>
    </ScrollView>
  );
}

function Sales({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const { recipes, sales, recordSale, batches, ingredients } = useInventory();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const sorted = recipes.slice().sort((a, b) => {
    const aCount = sales.filter((sale) => sale.recipeId === a.id).reduce((sum, sale) => sum + sale.quantity, 0);
    const bCount = sales.filter((sale) => sale.recipeId === b.id).reduce((sum, sale) => sum + sale.quantity, 0);
    return bCount - aCount;
  });
  const getAvailable = (recipeId: string) => {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe) return true;
    return recipe.ingredients.every((line) => {
      const available = stockFor(batches, line.ingredientId);
      return available >= line.quantity;
    });
  };
  const submit = (recipeId: string) => {
    const quantity = Math.max(1, Math.floor(numberValue(quantities[recipeId] ?? '1')));
    const success = recordSale(recipeId, quantity);
    setMessage(success ? `${quantity} adet satış stoğa işlendi.` : 'Bu satış için yeterli stok bulunmuyor.');
    if (success) setQuantities((previous) => ({ ...previous, [recipeId]: '' }));
    setTimeout(() => setMessage(null), 2600);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}><View><Text style={styles.eyebrow}>HIZLI İŞLEM</Text><Text style={styles.pageTitle}>Satış gir</Text></View><View style={styles.iconCircle}><Icon name="shopping-bag" size={20} color={colors.light.primary} /></View></View>
      <Text style={styles.introCopy}>En çok satan ürünler üstte. Adedi yazıp tek dokunuşla stoktan düş.</Text>
      {message ? <View style={[styles.toast, message.includes('yeterli') && styles.toastError]}><Icon name={message.includes('yeterli') ? 'alert-circle' : 'check-circle'} size={17} color={message.includes('yeterli') ? colors.light.destructive : colors.light.primary} /><Text style={styles.toastText}>{message}</Text></View> : null}
      <View style={styles.salesToday}><View><Text style={styles.metricLabel}>BUGÜNÜN TOPLAMI</Text><Text style={styles.salesTodayValue}>{sales.filter((sale) => sale.date === today()).reduce((sum, sale) => sum + sale.quantity, 0)} <Text style={styles.salesTodayUnit}>porsiyon</Text></Text></View><Icon name="trending-up" size={26} color={colors.light.primary} /></View>
      <SectionHeading title="Menü" action="Raporu gör" onAction={() => onNavigate('reports')} />
      {sorted.map((recipe, index) => {
        const sold = sales.filter((sale) => sale.recipeId === recipe.id).reduce((sum, sale) => sum + sale.quantity, 0);
        const available = getAvailable(recipe.id);
        return <View style={styles.saleCard} key={recipe.id}>
          <View style={styles.rank}><Text style={styles.rankText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.saleName}>{recipe.name}</Text><Text style={styles.rowMeta}>{sold} satış · {money(recipe.salePrice)}</Text><View style={styles.saleIngredients}><Text style={styles.miniLabel}>{recipe.ingredients.map((line) => ingredients.find((item) => item.id === line.ingredientId)?.name).filter(Boolean).slice(0, 2).join(' · ')}</Text></View></View>
          <View style={styles.saleControl}><TextInput testID={`input-sale-${recipe.id}`} keyboardType="decimal-pad" value={quantities[recipe.id] ?? ''} onChangeText={(value) => setQuantities((previous) => ({ ...previous, [recipe.id]: value }))} placeholder="1" placeholderTextColor={colors.light.mutedForeground} style={styles.quantityInput} /><Pressable testID={`button-sale-${recipe.id}`} disabled={!available} onPress={() => submit(recipe.id)} style={({ pressed }) => [styles.saleAdd, !available && styles.saleAddDisabled, pressed && styles.pressed]}><Icon name="plus" size={21} color={available ? colors.light.primaryForeground : colors.light.mutedForeground} /></Pressable></View>
        </View>;
      })}
      <View style={styles.tipBox}><Icon name="info" size={18} color={colors.light.accentForeground} /><Text style={styles.tipText}>Satış girerken reçetedeki malzemeler, son kullanma tarihi en yakın partiden başlayarak otomatik düşer.</Text></View>
    </ScrollView>
  );
}

function Stock({ onOpen }: { onOpen: (type: Exclude<ModalType, null>) => void }) {
  const { ingredients, batches } = useInventory();
  const [area, setArea] = useState<'Tümü' | Area>('Tümü');
  const [query, setQuery] = useState('');
  const visible = ingredients.filter((ingredient) => (area === 'Tümü' || ingredient.area === area) && ingredient.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}><View><Text style={styles.eyebrow}>DEPO VE ÜRÜNLER</Text><Text style={styles.pageTitle}>Stok</Text></View><Pressable style={styles.iconCircle} onPress={() => onOpen('ingredient')}><Icon name="plus" size={21} color={colors.light.primary} /></Pressable></View>
      <View style={styles.searchBox}><Icon name="search" size={18} color={colors.light.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Ürün ara..." placeholderTextColor={colors.light.mutedForeground} style={styles.searchInput} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{['Tümü', ...AREAS].map((item) => <Pressable key={item} onPress={() => setArea(item as 'Tümü' | Area)} style={[styles.filterChip, area === item && styles.filterChipActive]}><Text style={[styles.filterChipText, area === item && styles.filterChipTextActive]}>{item}</Text></Pressable>)}</ScrollView>
      <View style={styles.stockHeader}><Text style={styles.stockCount}>{visible.length} ürün</Text><PrimaryButton label="Sevkiyat" icon="package" onPress={() => onOpen('shipment')} secondary compact /></View>
      {visible.length === 0 ? <EmptyState icon="search" title="Ürün bulunamadı" copy="Arama veya depo filtresini değiştir." /> : <View style={styles.cardList}>{visible.map((ingredient) => {
        const stock = stockFor(batches, ingredient.id);
        const itemBatches = batches.filter((batch) => batch.ingredientId === ingredient.id && batch.quantity > 0).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
        const nearest = itemBatches[0];
        const isLow = stock <= ingredient.threshold;
        const days = nearest ? daysUntil(nearest.expiryDate) : 999;
        return <View style={styles.stockRow} key={ingredient.id}><View style={styles.stockGlyph}><Icon name={ingredient.area === 'Bar' ? 'coffee' : ingredient.area === 'Kuru depo' ? 'box' : 'thermometer'} size={18} color={colors.light.primary} /></View><View style={{ flex: 1 }}><View style={styles.stockNameLine}><Text style={styles.rowTitle}>{ingredient.name}</Text>{isLow ? <Pill tone="warning">Eşik altı</Pill> : null}</View><Text style={styles.rowMeta}>{ingredient.area} · eşik {ingredient.threshold} {ingredient.unit}</Text>{nearest ? <Text style={[styles.expiryText, days <= 3 && { color: colors.light.destructive }]}><Icon name="clock" size={12} color={days <= 3 ? colors.light.destructive : colors.light.mutedForeground} /> SKT {formatDate(nearest.expiryDate)} · {nearest.quantity.toFixed(1)} {ingredient.unit}</Text> : <Text style={styles.expiryText}>Stok partisi yok</Text>}</View><View style={styles.stockNumber}><Text style={[styles.stockValue, isLow && { color: colors.light.destructive }]}>{stock.toFixed(1)}</Text><Text style={styles.stockUnit}>{ingredient.unit}</Text></View></View>;
      })}</View>}
    </ScrollView>
  );
}

function Reports() {
  const { ingredients, recipes, batches, sales } = useInventory();
  const ingredientReports = ingredients.map((ingredient) => {
    const consumed = recipes.reduce((sum, recipe) => {
      const recipeSales = sales.filter((sale) => sale.recipeId === recipe.id).reduce((inner, sale) => inner + sale.quantity, 0);
      const line = recipe.ingredients.find((item) => item.ingredientId === ingredient.id);
      return sum + (line?.quantity ?? 0) * recipeSales;
    }, 0);
    const waste = batches.filter((batch) => batch.ingredientId === ingredient.id && batch.quantity > 0 && daysUntil(batch.expiryDate) < 0).reduce((sum, batch) => sum + batch.quantity, 0);
    return { ingredient, consumed, waste, loss: waste * ingredient.buyPrice, ratio: waste / Math.max(waste + consumed, 0.01) };
  });
  const recipeReports = recipes.map((recipe) => {
    const sold = sales.filter((sale) => sale.recipeId === recipe.id).reduce((sum, sale) => sum + sale.quantity, 0);
    const cost = recipe.ingredients.reduce((sum, line) => sum + (ingredients.find((item) => item.id === line.ingredientId)?.buyPrice ?? 0) * line.quantity, 0);
    return { recipe, sold, margin: recipe.salePrice - cost, marginRatio: (recipe.salePrice - cost) / recipe.salePrice };
  });
  const totalWaste = ingredientReports.reduce((sum, item) => sum + item.waste, 0);
  const totalLoss = ingredientReports.reduce((sum, item) => sum + item.loss, 0);
  const topWaste = ingredientReports.slice().sort((a, b) => b.ratio - a.ratio)[0];
  const topOpportunity = recipeReports.slice().sort((a, b) => b.margin - a.margin).find((item) => item.sold < Math.max(...recipeReports.map((candidate) => candidate.sold), 1) * 0.6);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}><View><Text style={styles.eyebrow}>VERİDEN KARARA</Text><Text style={styles.pageTitle}>Raporlar</Text></View><View style={styles.iconCircle}><Icon name="bar-chart-2" size={20} color={colors.light.primary} /></View></View>
      <Text style={styles.introCopy}>Satış, SKT firesi ve marjı aynı yerde gör. Öneriler, mevcut kayıtlarına göre oluşur.</Text>
      <View style={styles.reportSummary}><View><Text style={styles.metricLabel}>SKT FİRESİ</Text><Text style={styles.reportValue}>{totalWaste.toFixed(1)} <Text style={styles.reportUnit}>birim</Text></Text></View><View style={styles.summaryDivider} /><View><Text style={styles.metricLabel}>TAHMİNİ ZARAR</Text><Text style={[styles.reportValue, { color: colors.light.destructive }]}>{money(totalLoss)}</Text></View></View>
      <SectionHeading title="Öneriler" />
      <View style={styles.recommendations}>
        {topWaste && topWaste.waste > 0 ? <View style={styles.recommendation}><View style={[styles.recommendationIcon, { backgroundColor: '#f6ddd7' }]}><Icon name="alert-triangle" size={19} color={colors.light.destructive} /></View><View style={{ flex: 1 }}><Text style={styles.recommendationTitle}>Sipariş miktarını azalt</Text><Text style={styles.recommendationCopy}>{topWaste.ingredient.name} için fire oranı yüksek görünüyor.</Text><Text style={styles.recommendationStats}>Tüketim {topWaste.consumed.toFixed(1)} · Fire {topWaste.waste.toFixed(1)} · Zarar {money(topWaste.loss)}</Text></View></View> : null}
        {topOpportunity ? <View style={styles.recommendation}><View style={[styles.recommendationIcon, { backgroundColor: '#dcebe0' }]}><Icon name="trending-up" size={19} color={colors.light.primary} /></View><View style={{ flex: 1 }}><Text style={styles.recommendationTitle}>Bu ürünü öne çıkar</Text><Text style={styles.recommendationCopy}>{topOpportunity.recipe.name}, yüksek marja rağmen daha az satılıyor.</Text><Text style={styles.recommendationStats}>Satış {topOpportunity.sold} · Marj {money(topOpportunity.margin)} · Oran %{Math.round(topOpportunity.marginRatio * 100)}</Text></View></View> : null}
        {!topWaste?.waste && !topOpportunity ? <EmptyState icon="check-circle" title="Henüz öneri yok" copy="Daha fazla satış ve SKT kaydı oluştukça burada aksiyon önerileri görünecek." /> : null}
      </View>
      <SectionHeading title="Ürün performansı" />
      <View style={styles.cardList}>{ingredientReports.map((row) => <View style={styles.reportRow} key={row.ingredient.id}><View style={styles.reportName}><Text style={styles.rowTitle}>{row.ingredient.name}</Text><Text style={styles.rowMeta}>{row.ingredient.unit} · {money(row.ingredient.buyPrice)} alış</Text></View><View style={styles.reportMetric}><Text style={styles.reportMetricValue}>{row.consumed.toFixed(1)}</Text><Text style={styles.reportMetricLabel}>satış etkisi</Text></View><View style={styles.reportMetric}><Text style={[styles.reportMetricValue, row.waste > 0 && { color: colors.light.destructive }]}>{row.waste.toFixed(1)}</Text><Text style={styles.reportMetricLabel}>fire</Text></View><View style={styles.reportMetric}><Text style={styles.reportMetricValue}>{money(row.loss)}</Text><Text style={styles.reportMetricLabel}>zarar</Text></View></View>)}</View>
    </ScrollView>
  );
}

function More({ onOpen }: { onOpen: (type: Exclude<ModalType, null>) => void }) {
  const { recipes, ingredients, returns } = useInventory();
  const [showRecipes, setShowRecipes] = useState(true);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}><View><Text style={styles.eyebrow}>YÖNETİM</Text><Text style={styles.pageTitle}>Daha fazla</Text></View><View style={styles.avatar}><Icon name="sliders" size={18} color={colors.light.primaryForeground} /></View></View>
      <View style={styles.menuTiles}><Pressable style={styles.menuTile} onPress={() => onOpen('ingredient')}><View style={styles.tileIcon}><Icon name="archive" size={20} color={colors.light.primary} /></View><Text style={styles.tileTitle}>Ürün kartı</Text><Text style={styles.tileCopy}>Yeni malzeme tanımla</Text></Pressable><Pressable style={styles.menuTile} onPress={() => onOpen('recipe')}><View style={styles.tileIcon}><Icon name="book-open" size={20} color={colors.light.primary} /></View><Text style={styles.tileTitle}>Reçete</Text><Text style={styles.tileCopy}>Menü ürününü oluştur</Text></Pressable><Pressable style={styles.menuTile} onPress={() => onOpen('return')}><View style={styles.tileIcon}><Icon name="corner-up-left" size={20} color={colors.light.primary} /></View><Text style={styles.tileTitle}>İade</Text><Text style={styles.tileCopy}>İade kaydı ekle</Text></Pressable></View>
      <View style={styles.listHeader}><Text style={styles.sectionTitle}>Reçeteler <Text style={styles.countText}>{recipes.length}</Text></Text><Pressable onPress={() => setShowRecipes((value) => !value)}><Icon name={showRecipes ? 'chevron-up' : 'chevron-down'} size={20} color={colors.light.mutedForeground} /></Pressable></View>
      {showRecipes ? <View style={styles.cardList}>{recipes.map((recipe) => <View style={styles.recipeRow} key={recipe.id}><View style={styles.menuIcon}><Icon name="book-open" size={17} color={colors.light.primary} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{recipe.name}</Text><Text style={styles.rowMeta}>{recipe.ingredients.length} malzeme · {money(recipe.salePrice)}</Text></View><Icon name="chevron-right" size={18} color={colors.light.mutedForeground} /></View>)}</View> : null}
      <SectionHeading title={`Son iadeler · ${returns.length}`} />
      {returns.length === 0 ? <EmptyState icon="corner-up-left" title="Henüz iade kaydı yok" copy="İade edilen ürünleri kaydettiğinde burada listelenecek." /> : <View style={styles.cardList}>{returns.slice().reverse().slice(0, 5).map((item) => <View style={styles.recipeRow} key={item.id}><View style={styles.menuIcon}><Icon name="corner-up-left" size={17} color={colors.light.accentForeground} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name}</Text><Text style={styles.rowMeta}>{item.quantity} birim · {formatDate(item.date)} · {item.reason}</Text></View></View>)}</View>}
      <View style={styles.localNote}><Icon name="shield" size={17} color={colors.light.primary} /><Text style={styles.localNoteText}>Verilerin bu cihazda saklanır. Uygulamayı mutfaktaki tablet ve telefonda ayrı ayrı kullanabilirsin.</Text></View>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.light.mutedForeground} keyboardType={keyboardType} style={styles.fieldInput} /></View>;
}

function SelectRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>{options.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.selectOption, value === option && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option && styles.selectOptionTextActive]}>{option}</Text></Pressable>)}</ScrollView></View>;
}

function FormModal({ type, onClose }: { type: Exclude<ModalType, null>; onClose: () => void }) {
  const { ingredients, addIngredient, addShipment, addRecipe, addReturn } = useInventory();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [area, setArea] = useState<Area>('Soğuk depo');
  const [threshold, setThreshold] = useState('');
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(today());
  const [reason, setReason] = useState('');
  const [recipeLines, setRecipeLines] = useState<Record<string, string>>({});

  const titles: Record<Exclude<ModalType, null>, string> = { ingredient: 'Yeni ürün kartı', shipment: 'Sevkiyat girişi', recipe: 'Yeni reçete', return: 'İade kaydı' };
  const submit = () => {
    if (type === 'ingredient') {
      if (!name.trim()) return Alert.alert('Eksik bilgi', 'Ürün adını yazmalısın.');
      addIngredient({ name: name.trim(), unit: unit.trim() || 'adet', buyPrice: numberValue(buyPrice), salePrice: numberValue(salePrice), area, threshold: numberValue(threshold) });
    } else if (type === 'shipment') {
      if (!ingredientId || numberValue(quantity) <= 0) return Alert.alert('Eksik bilgi', 'Ürün ve miktar seçmelisin.');
      addShipment({ ingredientId, quantity: numberValue(quantity), expiryDate, area });
    } else if (type === 'recipe') {
      const recipeIngredients: RecipeIngredient[] = ingredients.map((item) => ({ ingredientId: item.id, quantity: numberValue(recipeLines[item.id] ?? '') })).filter((line) => line.quantity > 0);
      if (!name.trim() || recipeIngredients.length === 0) return Alert.alert('Eksik bilgi', 'Reçete adı ve en az bir malzeme gerekli.');
      addRecipe({ name: name.trim(), salePrice: numberValue(salePrice), ingredients: recipeIngredients });
    } else {
      if (!ingredientId || numberValue(quantity) <= 0) return Alert.alert('Eksik bilgi', 'Ürün ve miktar seçmelisin.');
      addReturn({ ingredientId, quantity: numberValue(quantity), date: expiryDate, reason: reason.trim() || 'Belirtilmedi' });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onClose();
  };

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{titles[type]}</Text><Pressable onPress={onClose} style={styles.closeButton}><Icon name="x" size={20} color={colors.light.foreground} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
    {type === 'ingredient' ? <><Field label="Ürün adı" value={name} onChangeText={setName} placeholder="Örn. Taze nane" /><View style={styles.fieldPair}><View style={{ flex: 1 }}><Field label="Birim" value={unit} onChangeText={setUnit} placeholder="kg, L, adet" /></View><View style={{ flex: 1 }}><Field label="Min. eşik" value={threshold} onChangeText={setThreshold} placeholder="5" keyboardType="decimal-pad" /></View></View><View style={styles.fieldPair}><View style={{ flex: 1 }}><Field label="Alış fiyatı" value={buyPrice} onChangeText={setBuyPrice} placeholder="0 ₺" keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Satış fiyatı" value={salePrice} onChangeText={setSalePrice} placeholder="0 ₺" keyboardType="decimal-pad" /></View></View><SelectRow label="Depo alanı" options={AREAS} value={area} onChange={(value) => setArea(value as Area)} /></> : null}
    {type === 'shipment' ? <><SelectRow label="Ürün" options={ingredients.map((item) => item.name)} value={ingredients.find((item) => item.id === ingredientId)?.name ?? ''} onChange={(value) => setIngredientId(ingredients.find((item) => item.name === value)?.id ?? '')} /><Field label="Miktar" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="decimal-pad" /><Field label="Son kullanma tarihi" value={expiryDate} onChangeText={setExpiryDate} placeholder="YYYY-AA-GG" /><SelectRow label="Depo alanı" options={AREAS} value={area} onChange={(value) => setArea(value as Area)} /></> : null}
    {type === 'return' ? <><SelectRow label="Ürün" options={ingredients.map((item) => item.name)} value={ingredients.find((item) => item.id === ingredientId)?.name ?? ''} onChange={(value) => setIngredientId(ingredients.find((item) => item.name === value)?.id ?? '')} /><Field label="Miktar" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="decimal-pad" /><Field label="İade tarihi" value={expiryDate} onChangeText={setExpiryDate} placeholder="YYYY-AA-GG" /><Field label="Sebep" value={reason} onChangeText={setReason} placeholder="Örn. ambalaj hasarı" /></> : null}
    {type === 'recipe' ? <><Field label="Menü ürünü adı" value={name} onChangeText={setName} placeholder="Örn. Mantarlı pizza" /><Field label="Satış fiyatı" value={salePrice} onChangeText={setSalePrice} placeholder="0 ₺" keyboardType="decimal-pad" /><Text style={styles.formSectionLabel}>Porsiyon başına malzeme</Text>{ingredients.map((item) => <View style={styles.recipeInputRow} key={item.id}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.unit}</Text></View><TextInput value={recipeLines[item.id] ?? ''} onChangeText={(value) => setRecipeLines((previous) => ({ ...previous, [item.id]: value }))} placeholder="0" placeholderTextColor={colors.light.mutedForeground} keyboardType="decimal-pad" style={styles.recipeInput} /></View>)}</> : null}
    <PrimaryButton label="Kaydet" icon="check" onPress={submit} />
  </ScrollView></View></View></Modal>;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { hydrated } = useInventory();
  const [section, setSection] = useState<Section>('summary');
  const [modal, setModal] = useState<ModalType>(null);
  useEffect(() => {
    if (Platform.OS === 'web' && process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  const content = useMemo(() => {
    if (section === 'summary') return <Dashboard onNavigate={setSection} onOpen={setModal} />;
    if (section === 'sales') return <Sales onNavigate={setSection} />;
    if (section === 'stock') return <Stock onOpen={setModal} />;
    if (section === 'reports') return <Reports />;
    return <More onOpen={setModal} />;
  }, [section]);
  const navItems: { key: Section; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { key: 'summary', label: 'Özet', icon: 'grid' },
    { key: 'sales', label: 'Satış', icon: 'shopping-bag' },
    { key: 'stock', label: 'Stok', icon: 'archive' },
    { key: 'reports', label: 'Rapor', icon: 'bar-chart-2' },
    { key: 'more', label: 'Daha', icon: 'more-horizontal' },
  ];
  if (!hydrated) return <View style={styles.loading}><ActivityIndicator color={colors.light.primary} /><Text style={styles.loadingText}>Mutfak hazırlanıyor...</Text></View>;
  return <View style={[styles.app, { paddingTop: Platform.OS === 'web' ? 0 : 0 }]}><View style={{ flex: 1 }}>{content}</View><View style={[styles.bottomNav, { paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 8), height: Platform.OS === 'web' ? 84 : 72 }]}>{navItems.map((item) => <Pressable testID={`nav-${item.key}`} key={item.key} onPress={() => setSection(item.key)} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}><View style={[styles.navIcon, section === item.key && styles.navIconActive]}><Icon name={item.icon} size={19} color={section === item.key ? colors.light.primary : colors.light.mutedForeground} /></View><Text style={[styles.navLabel, section === item.key && styles.navLabelActive]}>{item.label}</Text></Pressable>)}</View>{modal ? <FormModal type={modal} onClose={() => setModal(null)} /> : null}</View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.light.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.light.background },
  loadingText: { color: colors.light.mutedForeground, fontFamily: 'Inter_500Medium' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 67 : 14, paddingBottom: 118 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.3, color: colors.light.primary, marginBottom: 5 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 36, color: colors.light.foreground },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.primary },
  avatarText: { fontFamily: 'Inter_700Bold', color: colors.light.primaryForeground, fontSize: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.secondary },
  greetingRow: { borderRadius: 22, backgroundColor: '#dcebe0', padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  greetingTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.light.primary, marginBottom: 5 },
  greetingCopy: { color: '#547261', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, paddingRight: 10 },
  leafBadge: { backgroundColor: '#f2d7bd', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: { width: '48.5%', minHeight: 102, borderRadius: 17, padding: 14, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border },
  metricCardGreen: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  metricCardWarm: { backgroundColor: '#fff5e8', borderColor: '#f0d5ae' },
  metricLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.9, color: colors.light.mutedForeground },
  metricValue: { fontFamily: 'Inter_700Bold', fontSize: 23, color: colors.light.foreground, marginTop: 11 },
  metricHint: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.light.mutedForeground, marginTop: 4 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.primary },
  secondaryButton: { backgroundColor: colors.light.secondary, borderWidth: 1, borderColor: '#c8dbcc' },
  compactButton: { minHeight: 38, flex: 0, paddingHorizontal: 12, borderRadius: 11 },
  primaryButtonText: { color: colors.light.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 14 },
  secondaryButtonText: { color: colors.light.primary },
  compactButtonText: { fontSize: 12 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, marginTop: 2 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.light.foreground },
  linkText: { fontFamily: 'Inter_600SemiBold', color: colors.light.primary, fontSize: 12 },
  cardList: { borderRadius: 18, overflow: 'hidden', backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, marginBottom: 24 },
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 11, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  alertDot: { width: 9, height: 9, borderRadius: 5 },
  rowTitle: { fontFamily: 'Inter_600SemiBold', color: colors.light.foreground, fontSize: 14 },
  rowMeta: { fontFamily: 'Inter_400Regular', color: colors.light.mutedForeground, fontSize: 12, marginTop: 4 },
  pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  menuIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center' },
  circleAdd: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  introCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: colors.light.mutedForeground, marginBottom: 18 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#e1efe3', padding: 12, borderRadius: 13, marginBottom: 14 },
  toastError: { backgroundColor: '#f6ddd7' },
  toastText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.light.foreground, flex: 1 },
  salesToday: { backgroundColor: colors.light.card, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.light.border, marginBottom: 24 },
  salesTodayValue: { fontFamily: 'Inter_700Bold', fontSize: 31, color: colors.light.foreground, marginTop: 7 },
  salesTodayUnit: { fontFamily: 'Inter_500Medium', color: colors.light.mutedForeground, fontSize: 13 },
  saleCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.light.card, borderRadius: 18, borderWidth: 1, borderColor: colors.light.border, padding: 13, marginBottom: 10 },
  rank: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.light.primary },
  saleName: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 15 },
  saleIngredients: { marginTop: 8 },
  miniLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.light.mutedForeground },
  saleControl: { alignItems: 'center', gap: 6 },
  quantityInput: { width: 45, height: 31, borderWidth: 1, borderColor: colors.light.input, borderRadius: 9, textAlign: 'center', color: colors.light.foreground, fontFamily: 'Inter_600SemiBold', paddingVertical: 0 },
  saleAdd: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  saleAddDisabled: { backgroundColor: colors.light.muted },
  tipBox: { flexDirection: 'row', gap: 10, backgroundColor: '#f2d7bd', borderRadius: 15, padding: 14, marginTop: 6 },
  tipText: { flex: 1, fontFamily: 'Inter_500Medium', color: colors.light.accentForeground, fontSize: 12, lineHeight: 18 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 46, backgroundColor: colors.light.card, borderRadius: 13, borderWidth: 1, borderColor: colors.light.input, paddingHorizontal: 13, marginBottom: 12 },
  searchInput: { flex: 1, color: colors.light.foreground, fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 0 },
  chipRow: { gap: 7, paddingBottom: 18 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.light.muted },
  filterChipActive: { backgroundColor: colors.light.primary },
  filterChipText: { fontFamily: 'Inter_500Medium', color: colors.light.mutedForeground, fontSize: 12 },
  filterChipTextActive: { color: colors.light.primaryForeground },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stockCount: { fontFamily: 'Inter_600SemiBold', color: colors.light.mutedForeground, fontSize: 12 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  stockGlyph: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#eef3e9', alignItems: 'center', justifyContent: 'center' },
  stockNameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  expiryText: { fontFamily: 'Inter_500Medium', color: colors.light.mutedForeground, fontSize: 11, marginTop: 7 },
  stockNumber: { alignItems: 'flex-end', minWidth: 41 },
  stockValue: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 16 },
  stockUnit: { fontFamily: 'Inter_400Regular', color: colors.light.mutedForeground, fontSize: 10, marginTop: 2 },
  emptyState: { alignItems: 'center', backgroundColor: colors.light.card, borderRadius: 18, borderWidth: 1, borderColor: colors.light.border, padding: 24, marginBottom: 24 },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 15 },
  emptyCopy: { fontFamily: 'Inter_400Regular', color: colors.light.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, maxWidth: 260 },
  reportSummary: { flexDirection: 'row', backgroundColor: colors.light.primary, borderRadius: 20, padding: 18, marginBottom: 25, alignItems: 'center' },
  reportValue: { fontFamily: 'Inter_700Bold', color: colors.light.primaryForeground, fontSize: 24, marginTop: 8 },
  reportUnit: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  summaryDivider: { width: 1, height: 46, backgroundColor: 'rgba(255,255,255,0.28)', marginHorizontal: 24 },
  recommendations: { marginBottom: 8 },
  recommendation: { flexDirection: 'row', gap: 12, backgroundColor: colors.light.card, borderRadius: 17, borderWidth: 1, borderColor: colors.light.border, padding: 14, marginBottom: 10 },
  recommendationIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recommendationTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.light.foreground },
  recommendationCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: colors.light.mutedForeground, marginTop: 4 },
  recommendationStats: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.light.primary, marginTop: 8 },
  reportRow: { flexDirection: 'row', alignItems: 'center', padding: 13, borderBottomWidth: 1, borderBottomColor: colors.light.border, gap: 9 },
  reportName: { flex: 1, minWidth: 105 },
  reportMetric: { width: 48, alignItems: 'flex-end' },
  reportMetricValue: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 12 },
  reportMetricLabel: { fontFamily: 'Inter_400Regular', color: colors.light.mutedForeground, fontSize: 8, marginTop: 3 },
  menuTiles: { flexDirection: 'row', gap: 9, marginBottom: 28 },
  menuTile: { flex: 1, backgroundColor: colors.light.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.light.border, minHeight: 124 },
  tileIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  tileTitle: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 13 },
  tileCopy: { fontFamily: 'Inter_400Regular', color: colors.light.mutedForeground, fontSize: 10, lineHeight: 14, marginTop: 4 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  countText: { fontFamily: 'Inter_500Medium', color: colors.light.mutedForeground, fontSize: 13 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  localNote: { flexDirection: 'row', gap: 9, backgroundColor: colors.light.secondary, borderRadius: 14, padding: 13, marginTop: 3 },
  localNoteText: { flex: 1, color: colors.light.secondaryForeground, fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(24,52,43,0.42)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.light.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  modalTitle: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 20 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.light.muted, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 35 },
  field: { marginBottom: 15 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', color: colors.light.foreground, fontSize: 12, marginBottom: 7 },
  fieldInput: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.light.input, backgroundColor: colors.light.card, paddingHorizontal: 13, color: colors.light.foreground, fontFamily: 'Inter_400Regular', fontSize: 14 },
  fieldPair: { flexDirection: 'row', gap: 10 },
  selectRow: { gap: 7, paddingBottom: 2 },
  selectOption: { borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.light.muted, borderWidth: 1, borderColor: colors.light.muted },
  selectOptionActive: { backgroundColor: colors.light.secondary, borderColor: '#b7d2bd' },
  selectOptionText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.light.mutedForeground },
  selectOptionTextActive: { color: colors.light.primary, fontFamily: 'Inter_700Bold' },
  formSectionLabel: { fontFamily: 'Inter_700Bold', color: colors.light.foreground, fontSize: 14, marginTop: 3, marginBottom: 10 },
  recipeInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  recipeInput: { width: 70, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.light.input, backgroundColor: colors.light.card, textAlign: 'center', color: colors.light.foreground, fontFamily: 'Inter_600SemiBold' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.light.border, backgroundColor: colors.light.card, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 9 },
  navItem: { alignItems: 'center', justifyContent: 'center', width: '20%', gap: 3 },
  navIcon: { width: 32, height: 27, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: colors.light.secondary },
  navLabel: { fontFamily: 'Inter_500Medium', color: colors.light.mutedForeground, fontSize: 10 },
  navLabelActive: { color: colors.light.primary, fontFamily: 'Inter_700Bold' },
});
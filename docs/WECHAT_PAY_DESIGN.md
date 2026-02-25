# 微信支付打通方案

---

## 当前策略（无商户号）

**商业化方式**：仅依靠底部赞赏码（个人收款码）。

**对比功能**：每人 1 次免费，用完不再展示付款码，仅提示「在结果页底部可赞赏支持」。

**优化思路**（在不接商户号的前提下）：
- 底部赞赏码更醒目：适当增大、放在用户完成核心体验后必经位置
- 文案温暖：从「扫码支付」改为「请作者喝杯咖啡」「觉得有趣可以赞赏」
- 分享引导：分享给好友后，对方若赞赏，增加你的「人品值」感，间接促进传播
- 深度解读解锁：保留「分享解锁」或「赞赏后信任式解锁」，减少付费摩擦
- 避免在转化漏斗中打断：对比次数用完用简洁 modal，不塞付款码，避免用户反感

---

## 方案对比

| 方式 | 适用主体 | 自动到账校验 | 实现难度 |
|------|----------|--------------|----------|
| **个人收款码** | 个人 / 企业均可 | ❌ 无法 | 零（当前方案） |
| **商户号 API** | 需企业认证 | ✅ 回调自动 | 中高 |

---

## 个人收款码（当前方案）

**无需商户号**，用微信「收付款」→「二维码收款」生成收款码，保存为图片即可。

- ✅ 零成本、零开发，个人主体可用
- ✅ 用户扫码后直接支付任意金额
- ❌ **无法自动确认到账**：微信不会给你任何回调，你不知道谁付了、付了多少
- ❌ 只能依赖用户点击「已支付？点击解锁」后，你手动或信任式解锁

**适用场景**：小规模、信任制、或作为「赞赏」补充。当前：对比功能每人 1 次免费，无付款码；报告/深度解锁仍有「赞赏码 + 已支付？点击解锁」；商业化主要靠底部赞赏。

---

## 商户号 API（需企业认证）

## 前置条件

1. **微信商户号**（需企业认证，个人主体无法开通）
   - 注册 https://pay.weixin.qq.com
   - 完成商户认证、绑定结算银行卡

2. **小程序 / 公众号** 已与商户号关联（在商户平台 → 产品中心 → AppID 授权）

---

## 一、小程序端支付（JSAPI 支付）

### 流程

```
用户点击「支付」→ 后端创建订单 → 返回 prepay_id → 小程序调 wx.requestPayment → 用户输入密码完成 → 微信异步回调通知后端
```

### 后端接口设计

**1. 创建订单 `POST /api/payment/create`**

请求：
```json
{
  "reportId": "xxx",
  "amount": 66,       // 单位：分，固定 0.66 元 = 66
  "productType": "basic" | "deep"
}
```

逻辑：
- 校验 reportId 存在且未支付
- 调用微信统一下单 API（JSAPI），传入 openid
- 返回 `{ prepayId, ... }` 供前端调起支付

**2. 支付结果通知（回调）`POST /api/payment/notify`**

- 微信会向该 URL 发送 XML 格式的支付结果
- **必须**做：验签、校验金额、幂等（防重复通知）
- 验签通过且 `return_code=SUCCESS` 且 `result_code=SUCCESS` 且 `total_fee === 预期金额` 后，更新订单状态，并标记 report 为已付
- 返回 `<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>`

**金额校验示例（Node）**：
```javascript
const expectedFee = 66; // 固定 66 分
const actualFee = parseInt(notifyXml.total_fee, 10);
if (actualFee !== expectedFee) {
  console.error('金额不匹配', { expected: expectedFee, actual: actualFee });
  return 500;
}
```

---

## 二、网页端支付（Native 扫码 / H5）

网页端无法直接用 JSAPI（需要微信内打开）。可选：

### 方案 A：Native 支付（PC 扫码）

- 后端调用统一下单 API，传 `trade_type=NATIVE`，返回 `code_url`
- 前端用 qrcode 库将 code_url 生成二维码展示
- 用户用手机微信扫一扫完成支付
- 回调同上，验签 + 校验金额

### 方案 B：H5 支付（手机浏览器）

- `trade_type=MWEB`，返回 `mweb_url`
- 前端跳转到该 URL，在微信内置浏览器完成支付

### 网页端接口

**创建订单 `POST /api/payment/create-web`**

```json
{
  "reportId": "xxx",
  "amount": 66,
  "productType": "basic" | "deep",
  "clientType": "native" | "h5"
}
```

返回：
- native: `{ codeUrl: "weixin://wxpay/..." }` → 前端生成二维码
- h5: `{ redirectUrl: "https://..." }` → 前端跳转

---

## 三、回调接口设计（统一）

| 项目 | 说明 |
|------|------|
| URL | `https://your-domain.com/api/payment/notify` |
| 方法 | POST |
| 格式 | XML |
| 验签 | 用商户密钥验证 `sign` 字段 |
| 校验 | `total_fee === 订单创建时的金额` |
| 幂等 | 用 `out_trade_no` + 状态，避免重复处理 |
| 响应 | 成功返回 `SUCCESS` 的 XML，否则微信会重试 |

---

## 四、数据库 / 存储

建议字段：
- `out_trade_no`（商户订单号，唯一）
- `report_id`
- `product_type`（basic/deep）
- `amount`（分）
- `status`（pending/paid/failed）
- `openid`（小程序用）
- `transaction_id`（微信支付单号）

---

## 五、安全要点

1. **商户密钥** 放 `.env`，绝不能进前端
2. **金额** 由后端写死（如 66、99），不从前端传
3. **回调验签** 必须做，否则可能被伪造
4. **HTTPS** 回调 URL 必须用 HTTPS

---

## 六、实现顺序建议

1. 开通商户号 + 完成关联
2. 实现 `POST /api/payment/notify`（先写死返回 SUCCESS，打印日志）
3. 实现 `POST /api/payment/create`（小程序）
4. 小程序端接入 `wx.requestPayment`
5. 实现 `POST /api/payment/create-web`（网页 Native）
6. 网页端集成二维码展示

# 阿里云 CDN 配置指南 — 国内访问加速

目标：通过阿里云 CDN 加速 `vinex.top`，使国内用户无需 VPN 即可访问（源站为 Vercel）。

---

## 前置条件

- 域名 `vinex.top` 已备案
- 备案在阿里云
- 阿里云账号已开通 CDN 服务（未开通可先免费试用）

---

## 一、获取 Vercel 源站地址

1. 登录 [Vercel](https://vercel.com) → 进入项目 `app`
2. **Settings** → **Domains**：列表中除了 `vinex.top`，会有一个 `*.vercel.app` 的域名，即项目默认 URL
3. 或 **Deployments** → 点击最新 Production 部署 → 查看 **Visit** 链接中的域名（形如 `app-xxxxx-whuvinexio-3019s-projects.vercel.app`）
4. 将该域名**去掉 `https://`** 后，作为 CDN 源站地址填入，例如：`app-theta-puce.vercel.app`

> 源站必须是 `xxx.vercel.app` 格式，不能使用 `vinex.top`（否则会形成循环）。

---

## 二、添加 CDN 加速域名

1. 登录 [阿里云 CDN 控制台](https://cdn.console.aliyun.com/)
2. **域名管理** → **添加域名**
3. 按以下填写：

| 配置项 | 值 |
|--------|-----|
| **加速域名** | `vinex.top` |
| **加速区域** | 中国境内 |
| **源站类型** | 源站域名 |
| **源站地址** | `app-theta-puce.vercel.app`（替换为你的实际 Vercel 域名） |
| **回源协议** | HTTPS |
| **回源 Host** | 与源站地址相同（如 `app-theta-puce.vercel.app`） |
| **端口** | 443 |

4. 提交后等待审核（备案域名通常几分钟内通过）

---

## 三、配置 HTTPS 证书

1. 进入该域名 → **HTTPS 配置**
2. 开启 **HTTPS**，选择：
   - **证书类型**：免费证书（或上传已有证书）
   - 若用免费证书，按提示在阿里云申请并选择
3. **强制 HTTPS** 建议开启
4. 保存配置

---

## 四、配置缓存规则（重要）

Next.js 有静态资源与动态接口，需要区分：

1. 进入域名 → **缓存配置** → **缓存过期时间**
2. 添加/调整规则（按优先级从高到低）：

| 路径/类型 | 缓存时间 | 说明 |
|-----------|----------|------|
| `/_next/static/*` | 1 年 (31536000 秒) | Next.js 静态资源，强缓存 |
| `/images/*` | 30 天 (2592000 秒) | 图片等静态资源 |
| `/*.js` `/*.css` | 7 天 (604800 秒) | JS/CSS |
| `/api/*` | 不缓存 (0 秒) | API 接口，必须回源 |
| `/result/*` | 不缓存 (0 秒) | 动态页面 |
| `/invite/*` | 不缓存 (0 秒) | 邀请页 |
| `/compare/*` | 不缓存 (0 秒) | 对比页 |
| `/` | 1 小时 (3600 秒) | 首页，可短缓存 |
| `/*` | 10 分钟 (600 秒) | 默认兜底 |

> 优先保证 `/api/*` 与动态路由不缓存，避免数据错误。

---

## 五、回源配置

1. 进入 **回源配置**
2. **回源 Host**：设置为与源站相同的 `xxx.vercel.app`（Vercel 按 Host 路由）
3. **回源协议**：HTTPS
4. **回源 SNI**：与回源 Host 一致（开启 HTTPS 回源时需配置）
5. **回源超时**：建议 30 秒

---

## 六、修改 DNS 解析

CDN 生效后，控制台会给出该域名的 CNAME，例如：`vinex.top.w.kunlunsl.com` 或 `xxx.cdn.dnsv1.com`。

1. 登录 [阿里云 云解析 DNS](https://dns.console.aliyun.com/)
2. 找到 `vinex.top` → **解析设置**
3. 修改/新增记录：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|----------|----------|--------|------|
| **CNAME** | `@` | CDN 分配给你的 CNAME | 根域名（部分解析支持 CNAME  flatten） |
| **CNAME** | `www` | CDN 分配给你的 CNAME | www 子域名 |

> 若根域名 `@` 不支持 CNAME（RFC 限制）：  
> - 阿里云 CDN 通常提供 **A 记录** 的加速 IP，可在 CDN 控制台「DNS 配置」中查看  
> - 或使用「显性 URL 转发」将 `vinex.top` 301 到 `www.vinex.top`，主站用 `www` 即可

4. 删除或停用原先指向 Vercel 的 A 记录 / CNAME（`76.76.21.21`、`cname.vercel-dns.com`）
5. 等待解析生效（约 10 分钟 ~ 2 小时）

---

## 七、Vercel 域名处理

- 在 Vercel **Settings** → **Domains** 中可保留 `vinex.top` 和 `www.vinex.top`
- 流量将经 CDN 回源到 Vercel，不影响部署
- 若担心冲突，可暂时移除 Vercel 上的自定义域名，仅用 CDN + 源站 `xxx.vercel.app` 验证；确认无误后再加回

---

## 八、校验与故障排查

### 1. 验证 CDN 是否生效

```bash
# 查看解析是否指向 CDN
dig vinex.top

# 访问站点
curl -I https://vinex.top
```

响应头中应有 `X-Cache: HIT` 或 `X-Cache: MISS` 等 CDN 标识。

### 2. 常见问题

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 502 / 回源失败 | 源站地址错误、回源 Host 不对 | 核对 Vercel 源站域名与回源 Host |
| 页面数据错误 / 接口异常 | API 被缓存 | 对 `/api/*` 等路径设置为不缓存 |
| 一直 MISS | 缓存规则过短或未命中 | 检查缓存规则路径和优先级 |
| HTTPS 报错 | 证书未生效或 SNI 错误 | 确认证书状态与回源 SNI 配置 |

---

## 九、成本说明

- 阿里云 CDN 中国境内按流量/带宽计费，有免费试用额度
- 个人小站流量不高时，成本通常较低
- 可在 CDN 控制台查看用量与账单

---

## 参考

- [阿里云 CDN 域名管理](https://help.aliyun.com/zh/cdn/user-guide/domain-name-management/)
- [配置回源 Host](https://help.aliyun.com/zh/cdn/user-guide/configure-an-origin-server)
- [缓存过期时间](https://help.aliyun.com/zh/cdn/user-guide/cache-expiration-time)

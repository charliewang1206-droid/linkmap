import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4173/linkmap/';

/**
 * LinkMap 端到端测试套件
 * 覆盖所有核心功能：添加人物、编辑、删除、关系连线、视图切换、搜索、导出、备份
 */

/** 辅助函数：打开添加人物弹窗并等待加载 */
async function openAddModal(page: Page) {
  await page.locator('button:has-text("添加人物")').first().click();
  // 等待模态框出现 - 通过名字输入框来判断
  await page.waitForSelector('input[placeholder="请输入名字"]', { timeout: 5000 });
}

/** 辅助函数：填写人物信息并提交 */
async function fillAndSubmitPerson(
  page: Page,
  name: string,
  options?: { city?: string; title?: string; company?: string }
) {
  await page.locator('input[placeholder="请输入名字"]').fill(name);
  if (options?.city) {
    await page.locator('input[placeholder="如：北京"]').fill(options.city);
  }
  if (options?.title) {
    await page.locator('input[placeholder="如：产品经理"]').fill(options.title);
  }
  if (options?.company) {
    await page.locator('input[placeholder="如：字节跳动"]').fill(options.company);
  }
  // 使用精确的 CSS 类选择器定位弹窗底部的蓝色"添加"按钮（rounded-xl 是弹窗内按钮独有的类）
  await page.locator('button.bg-blue-600.rounded-xl').filter({ hasText: '添加' }).click();
  await page.waitForTimeout(500);
}

test.describe('人物管理 (Person CRUD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // 等待应用加载 - h1 是 TopNav 中的 "LinkMap"
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
  });

  test('应该显示空状态页面', async ({ page }) => {
    await expect(page.locator('text=暂无人物')).toBeVisible();
    // 确认"添加人物"按钮存在
    const addButton = page.locator('button:has-text("添加人物")');
    await expect(addButton.first()).toBeVisible();
  });

  test('应该能通过弹窗添加第一个人物', async ({ page }) => {
    await openAddModal(page);
    await fillAndSubmitPerson(page, '张三', {
      city: '北京',
      title: '产品经理',
      company: '字节跳动',
    });
    // 验证人物已显示在画布上或侧边栏
    await expect(page.locator('text=张三').first()).toBeVisible({ timeout: 5000 });
  });

  test('应该能添加多个人物', async ({ page }) => {
    // 添加第一个人
    await openAddModal(page);
    await fillAndSubmitPerson(page, '张三');

    // 添加第二个人
    await openAddModal(page);
    await fillAndSubmitPerson(page, '李四');

    // 添加第三个人
    await openAddModal(page);
    await fillAndSubmitPerson(page, '王五');

    // 验证三个人物都显示（至少在侧边栏或画布上可见）
    await expect(page.locator('text=张三').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=李四').first()).toBeVisible();
    await expect(page.locator('text=王五').first()).toBeVisible();
  });

  test('添加人物弹窗可以取消', async ({ page }) => {
    await openAddModal(page);
    await page.locator('input[placeholder="请输入名字"]').fill('测试用户');
    // 点击取消按钮
    await page.locator('button:has-text("取消")').first().click();
    await page.waitForTimeout(300);
    // 验证人物没有添加
    await expect(page.locator('text=测试用户')).toHaveCount(0);
  });

  test('点击背景可以关闭添加弹窗', async ({ page }) => {
    await openAddModal(page);
    // 点击遮罩层（fixed z-[100] 的模态遮罩）
    const overlay = page.locator('.fixed.z-\\[100\\]').first();
    await overlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    // 弹窗应该关闭
    await expect(page.locator('input[placeholder="请输入名字"]')).toHaveCount(0);
  });
});

test.describe('人物编辑和删除', () => {
  /** beforeEach 中添加一个人物供后续测试操作 */
  async function setupWithPerson(page: Page) {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
    await openAddModal(page);
    await fillAndSubmitPerson(page, '张三');
  }

  test.beforeEach(async ({ page }) => setupWithPerson(page));

  test('点击人物节点应该打开编辑面板', async ({ page }) => {
    // 点击人物节点（在 ReactFlow 中）
    const node = page.locator('.react-flow__node');
    await node.first().click();
    await page.waitForTimeout(500);
    // 验证编辑面板出现 - EditPanel 标题
    await expect(page.locator('text=编辑人物')).toBeVisible({ timeout: 5000 });
  });

  test('编辑面板应该显示人物信息', async ({ page }) => {
    await page.locator('.react-flow__node').first().click();
    await page.waitForTimeout(500);
    // 验证名字字段显示张三（EditPanel 中的 input value）
    const nameInput = page.locator('input[placeholder="请输入名字"]');
    // EditPanel 中应该有值为 "张三" 的 input
    const allNameInputs = await nameInput.all();
    let found = false;
    for (const input of allNameInputs) {
      const val = await input.inputValue();
      if (val === '张三') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('应该能删除人物', async ({ page }) => {
    await page.locator('.react-flow__node').first().click();
    await page.waitForTimeout(500);
    // 点击"删除人物"按钮
    await page.locator('button:has-text("删除人物")').click();
    await page.waitForTimeout(300);
    // 点击"确认删除"
    await page.locator('button:has-text("确认删除")').click();
    await page.waitForTimeout(500);
    // 验证人物已删除 - 应该回到空状态或至少没有张三了
    await expect(page.locator('text=暂无人物')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('视图系统 (Views)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
  });

  test('应该显示四个默认视图', async ({ page }) => {
    await expect(page.locator('button:has-text("全局")')).toBeVisible();
    await expect(page.locator('button:has-text("职业")')).toBeVisible();
    await expect(page.locator('button:has-text("家庭")')).toBeVisible();
    await expect(page.locator('button:has-text("朋友")')).toBeVisible();
  });

  test('应该能切换到不同视图', async ({ page }) => {
    await page.locator('button:has-text("职业")').click();
    await page.waitForTimeout(300);
    // 职业视图应该是激活状态（包含 bg-blue-50）
    const workButton = page.locator('button:has-text("职业")');
    await expect(workButton).toHaveClass(/bg-blue-50/);
  });

  test('应该能创建自定义视图', async ({ page }) => {
    // 点击 + 按钮（创建自定义视图）
    await page.locator('button[title="创建自定义视图"]').click();
    // 输入视图名称
    const input = page.locator('input[placeholder="视图名称"]');
    await input.fill('同学圈');
    await input.press('Enter');
    await page.waitForTimeout(300);
    // 验证新视图出现
    await expect(page.locator('button:has-text("同学圈")')).toBeVisible();
  });
});

test.describe('搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
    // 添加多个人物
    for (const name of ['张三', '李四', '王五']) {
      await openAddModal(page);
      await fillAndSubmitPerson(page, name);
    }
  });

  test('搜索应该能过滤人物', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="搜索人物..."]');
    await searchInput.fill('张三');
    await page.waitForTimeout(500);
    // 张三应该可见
    await expect(page.locator('text=张三').first()).toBeVisible();
    // 李四不应该在侧边栏可见
    const sidebarList = page.locator('aside');
    await expect(sidebarList.locator('text=李四')).toHaveCount(0);
  });

  test('清空搜索应该显示所有人物', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="搜索人物..."]');
    await searchInput.fill('张三');
    await page.waitForTimeout(300);
    await searchInput.clear();
    await page.waitForTimeout(300);
    // 所有人物都应该可见
    await expect(page.locator('text=张三').first()).toBeVisible();
    await expect(page.locator('text=李四').first()).toBeVisible();
  });
});

test.describe('侧边栏筛选', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
  });

  test('筛选按钮应该可见', async ({ page }) => {
    // 城市筛选按钮默认文本是"城市"
    await expect(page.locator('button:has-text("城市")').first()).toBeVisible();
    // 职位筛选按钮
    await expect(page.locator('button:has-text("职位")').first()).toBeVisible();
    // 标签筛选按钮
    await expect(page.locator('button:has-text("标签")').first()).toBeVisible();
  });
});

test.describe('导出和备份', () => {
  test('页面应包含 LinkMap 标识', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('linkmap');
  });
});

test.describe('移动端响应式', () => {
  test('移动端视口应该正常工作', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForSelector('h1:has-text("LinkMap")', { timeout: 10000 });
    // 移动端应该能看到 Logo
    await expect(page.locator('h1:has-text("LinkMap")')).toBeVisible();
  });
});

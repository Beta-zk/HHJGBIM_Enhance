/**
 * @const BigScreenHost
 * @description 生产看板页宿主页面契约：集中指标卡片、数值节点与侧边栏菜单选择器。
 */
export const BigScreenHost = {
    /** 指标卡片容器（前两项用于绑定跳转） */
    RIGHT_BOX_SELECTOR: '.content_box .box .right-box',
    /** 卡片内数值组容器 */
    NUM_BOX_SELECTOR: '.num-box',
    /** 数值节点（绑定点击的目标 span） */
    NUM_VALUE_SELECTOR: '.num-1 span.num',
    /** 侧边栏菜单项 */
    SIDEBAR_MENU_SELECTOR: '.ep-menu-item'
};

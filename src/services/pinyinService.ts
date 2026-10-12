import { Word } from '../types';

// Map of common Chinese characters/words to standard pinyin with tone marks
const COMMON_PINYIN_MAP: Record<string, string> = {
  // Pronouns & particles
  '我': 'wǒ', '你': 'nǐ', '他': 'tā', '她': 'tā', '它': 'tā',
  '我们': 'wǒmen', '你们': 'nǐmen', '他们': 'tāmen', '她们': 'tāmen',
  '的': 'de', '得': 'de', '地': 'de', '了': 'le', '吗': 'ma', '呢': 'ne', '吧': 'ba', '着': 'zhe', '过': 'guo',
  '这': 'zhè', '这儿': 'zhèr', '这里': 'zhèlǐ', '那': 'nà', '那儿': 'nàr', '那里': 'nàlǐ',
  '哪': 'nǎ', '哪儿': 'nǎr', '哪里': 'nǎlǐ', '谁': 'shéi', '什么': 'shénme',
  '怎么': 'zěnme', '怎么样': 'zěnmeyàng', '为什么': 'wèi shénme',
  '不': 'bù', '没': 'méi', '没有': 'méiyǒu', '很': 'hěn', '太': 'tài', '真': 'zhēn', '最': 'zuì',
  '也': 'yě', '都': 'dōu', '就': 'jiù', '才': 'cái', '还': 'hái', '又': 'yòu', '再': 'zài',
  '在': 'zài', '从': 'cóng', '到': 'dào', '对': 'duì', '给': 'gěi', '跟': 'gēn', '把': 'bǎ', '被': 'bèi',
  '是': 'shì', '有': 'yǒu', '会': 'huì', '能': 'néng', '想': 'xiǎng', '要': 'yào', '可以': 'kěyǐ',
  '去': 'qù', '来': 'lái', '看': 'kàn', '听': 'tīng', '说': 'shuō', '写': 'xiě', '读': 'dú', '吃': 'chī', '喝': 'hē',
  '做': 'zuò', '买': 'mǎi', '卖': 'mài', '坐': 'zuò', '走': 'zǒu', '跑': 'pǎo', '等': 'děng', '住': 'zhù',
  '穿': 'chuān', '带': 'dài', '拿': 'ná', '放': 'fàng', '找': 'zhǎo', '帮': 'bāng', '让': 'ràng', '教': 'jiāo',
  '学': 'xué', '玩': 'wán', '问': 'wèn', '答': 'dá', '试': 'shì', '笑': 'xiào', '哭': 'kū',
  '好': 'hǎo', '大': 'dà', '小': 'xiǎo', '多': 'duō', '少': 'shǎo', '冷': 'lěng', '热': 'rè', '高': 'gāo', '矮': 'ǎi',
  '快': 'kuài', '慢': 'màn', '长': 'cháng', '短': 'duǎn', '新': 'xīn', '旧': 'jiù', '红': 'hóng', '白': 'bái', '黑': 'hēi',
  '一': 'yī', '二': 'èr', '三': 'sān', '四': 'sì', '五': 'wǔ', '六': 'liù', '七': 'qī', '八': 'bā', '九': 'jiǔ', '十': 'shí',
  '零': 'líng', '百': 'bǎi', '千': 'qiān', '万': 'wàn', '两': 'liǎng', '半': 'bàn', '第': 'dì',
  '个': 'gè', '岁': 'suì', '块': 'kuài', '元': 'yuán', '角': 'jiǎo', '本': 'běn', '些': 'xiē', '点': 'diǎn', '分': 'fēn',
  '次': 'cì', '张': 'zhāng', '只': 'zhī', '条': 'tiáo', '件': 'jiàn', '双': 'shuāng', '位': 'wèi', '辆': 'liàng',
  '年': 'nián', '月': 'yuè', '日': 'rì', '号': 'hào', '天': 'tiān', '今天': 'jīntiān', '明天': 'míngtiān', '昨天': 'zuótiān',
  '今年': 'jīnnián', '明年': 'míngnián', '去年': 'qùnián', '现在': 'xiànzài', '以前': 'yǐqián', '以后': 'yǐhòu',
  '上午': 'shàngwǔ', '中午': 'zhōngwǔ', '下午': 'xiàwǔ', '晚上': 'wǎnshang', '早上': 'zǎoshang', '小时': 'xiǎoshí',
  '分钟': 'fēnzhōng', '时候': 'shíhou', '时间': 'shíjiān',
  '爸爸': 'bàba', '妈妈': 'māma', '哥哥': 'gēge', '姐姐': 'jiějie', '弟弟': 'dìdi', '妹妹': 'mèimei',
  '儿子': 'érzi', '女儿': 'nǚ\'ér', '老师': 'lǎoshī', '学生': 'xuésheng', '同学': 'tóngxué', '朋友': 'péngyou',
  '医生': 'yīshēng', '护士': 'hùshi', '师傅': 'shīfu', '经理': 'jīnglǐ', '客人': 'kèrén',
  '医院': 'yīyuàn', '学校': 'xuéxiào', '家': 'jiā', '北京': 'Běijīng', '中国': 'Zhōngguó', '商店': 'shāngdiàn',
  '超市': 'chāoshì', '饭店': 'fàndiàn', '火车站': 'huǒchēzhàn', '机场': 'jīchǎng', '教室': 'jiàoshì', '房间': 'fángjiān',
  '洗手间': 'xǐshǒujiān', '厕所': 'cèsuǒ', '厨房': 'chúfáng', '路': 'lù', '门': 'mén',
  '甲': 'Jiǎ', '乙': 'Yǐ', '先生': 'xiānsheng', '小姐': 'xiǎojiě', '女士': 'nǚshì',
  '阿姨': 'āyí', '叔叔': 'shūshu', '爷爷': 'yéye', '奶奶': 'nǎinai',
  '喜欢': 'xǐhuan', '爱好': 'àihào', '爱': 'ài', '高兴': 'gāoxìng', '快乐': 'kuàilè', '认识': 'rènshi',
  '名字': 'míngzi', '书': 'shū', '电脑': 'diànnǎo', '电视': 'diànshì', '电影': 'diànyǐng', '东西': 'dōngxi',
  '水果': 'shuǐguǒ', '苹果': 'píngguǒ', '西瓜': 'xīguā', '米饭': 'mǐfàn', '面条': 'miàntiáo', '水': 'shuǐ', '茶': 'chá', '菜': 'cài',
  '肉': 'ròu', '牛肉': 'niúròu', '羊肉': 'yángròu', '鱼': 'yú', '蛋': 'dàn', '鸡蛋': 'jīdàn', '牛奶': 'niúnǎi', '咖啡': 'kāfēi',
  '出租车': 'chūzūchē', '飞机': 'fēijī', '火车': 'huǒchē', '公共汽车': 'gōnggòng qìchē', '自行车': 'zìxíngchē', '船': 'chuán',
  '工作': 'gōngzuò', '学习': 'xuéxí', '汉语': 'Hànyǔ', '中文': 'Zhōngwén', '英语': 'Yīngyǔ', '字': 'zì', '汉字': 'Hànzì',
  '对不起': 'duìbuqǐ', '没关系': 'méi guānxi', '不客气': 'bú kèqi', '谢谢': 'xièxie', '再见': 'zàijiàn', '请': 'qǐng', '请问': 'qǐngwèn',
  '桌子': 'zhuōzi', '椅子': 'yǐzi', '床': 'chuáng', '猫': 'māo', '狗': 'gǒu', '鸟': 'niǎo',
  '前面': 'qiánmiàn', '后面': 'hòumiàn', '上面': 'shàngmiàn', '下面': 'xiàmiàn', '左边': 'zuǒbian', '右边': 'yòubian',
  '上': 'shàng', '下': 'xià', '前': 'qián', '后': 'hòu', '左': 'zuǒ', '右': 'yòu', '里': 'lǐ', '外': 'wài',
  '衣服': 'yīfu', '裤子': 'kùzi', '衬衫': 'chènshān', '裙子': 'qúnzi', '鞋': 'xié', '帽子': 'màozi', '杯子': 'bēizi',
  '打电话': 'dǎ diànhuà', '睡觉': 'shuìjiào', '起床': 'qǐchuáng', '天气': 'tiānqì', '下雨': 'xiàyǔ', '刮风': 'guāfēng', '晴': 'qíng', '阴': 'yīn',
  '钱': 'qián', '多少钱': 'duōshao qián', '贵': 'guì', '便宜': 'piányi',
  '因为': 'yīnwèi', '所以': 'suǒyǐ', '虽然': 'suīrán', '但是': 'dànshì', '如果': 'rúguǒ', '而且': 'érqiě',
  '或者': 'huòzhě', '还是': 'háishì', '一边': 'yìbiān',
  '准备': 'zhǔnbèi', '帮助': 'bāngzhù', '介绍': 'jièshào', '运动': 'yùndòng', '跑步': 'pǎobù', '游泳': 'yóuyǒng',
  '踢足球': 'tī zúqiú', '打篮球': 'dǎ lánqiú', '唱歌': 'chànggē', '跳舞': 'tiàowǔ', '旅游': 'lǚyóu', '出发': 'chūfā',
  '开始': 'kāishǐ', '结束': 'jiéshù', '完成': 'wánchéng', '解决': 'jiějué', '决定': 'juédìng',
  '已经': 'yǐjīng', '经常': 'jīngcháng', '一直': 'yìzhí', '马上': 'mǎshàng', '先': 'xiān', '然后': 'ránhòu',
  '一定': 'yídìng', '可能': 'kěnéng', '必须': 'bìxū', '应该': 'yīnggāi',
  '身体': 'shēntǐ', '眼睛': 'yǎnjing', '耳朵': 'ěrduo', '鼻子': 'bízi', '嘴': 'zuǐ', '手': 'shǒu', '脚': 'jiǎo', '头': 'tóu',
  '感冒': 'gǎnmào', '生病': 'shēngbìng', '发烧': 'fāshāo', '疼': 'téng', '药': 'yào', '吃药': 'chīyào',
};

/**
 * Automatically convert any Chinese sentence to full sentence Pinyin
 * using the word deck and built-in dictionary.
 */
export function getSentencePinyin(sentence: string, deckWords: Word[] = []): string {
  if (!sentence) return '';

  // Build sorted vocabulary dictionary (longer phrases first to match greedily)
  const lookup: [string, string][] = [];

  // 1. Add words from deck
  deckWords.forEach((w) => {
    if (w.hanzi && w.pinyin) {
      lookup.push([w.hanzi, w.pinyin]);
    }
  });

  // 2. Add common vocabulary map
  Object.entries(COMMON_PINYIN_MAP).forEach(([hanzi, pinyin]) => {
    lookup.push([hanzi, pinyin]);
  });

  // Sort descending by length
  lookup.sort((a, b) => b[0].length - a[0].length);

  let result = '';
  let i = 0;

  while (i < sentence.length) {
    const char = sentence[i];

    // Preserve punctuation and spaces directly
    if (/[，。！？、：；“”‘’（）—…\s,.!?:;'"/()—\-]/.test(char)) {
      result += char === '，' ? ', ' : char === '。' ? '. ' : char === '？' ? '? ' : char === '！' ? '! ' : char === '：' ? ': ' : char;
      i++;
      continue;
    }

    // Try multi-character match from lookup
    let matched = false;
    for (const [hanzi, pinyin] of lookup) {
      if (sentence.startsWith(hanzi, i)) {
        if (result && !result.endsWith(' ') && !result.endsWith('\n') && !result.endsWith('(') && !result.endsWith('[')) {
          result += ' ';
        }
        result += pinyin;
        i += hanzi.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Single character fallback or unmapped character
      result += (result && !result.endsWith(' ') ? ' ' : '') + char;
      i++;
    }
  }

  // Capitalize first letter of each sentence
  return result
    .replace(/(^|[.?!]\s+)([a-zàáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ])/g, (m, p1, p2) => p1 + p2.toUpperCase())
    .trim();
}

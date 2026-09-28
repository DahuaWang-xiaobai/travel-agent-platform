/**
 * 行程封面图。
 *
 * 数据库里**不存图片**，只存目的地名字；
 * 需要展示时按目的地实时拼一个文生图地址，这样换图机制时不用改数据。
 */
export function coverImageFor(destination: string) {
  const prompt = `${destination} China travel photography cityscape landmark warm daylight realistic cinematic`;
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=landscape_4_3`;
}

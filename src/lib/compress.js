export function compressImage(file, maxWidthPx = 1200, qualityPercent = 0.75) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width)
          width = maxWidthPx
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            const compressed = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            console.log(
              `Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`
            )
            resolve(compressed)
          },
          'image/jpeg',
          qualityPercent
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
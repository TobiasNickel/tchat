export function resizeImage(
  input: string | File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    // Convert File to dataUrl if needed
    if (input instanceof File) {
      const reader = new FileReader()
      reader.onload = () => {
        img.src = reader.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(input)
    } else {
      img.src = input
    }

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get canvas context"))
        return
      }

      const aspectRatio = img.width / img.height
      if (img.width > maxWidth || img.height > maxHeight) {
        if (aspectRatio > 1) {
          canvas.width = maxWidth
          canvas.height = maxWidth / aspectRatio
        } else {
          canvas.height = maxHeight
          canvas.width = maxHeight * aspectRatio
        }
      } else {
        canvas.width = img.width
        canvas.height = img.height
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to resize image"))
          }
        },
        "image/png" // You can change this to 'image/jpeg' if you prefer
      )
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }
  })
}

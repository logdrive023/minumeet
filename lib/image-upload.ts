import { getSupabaseClient } from "./supabase/client"

/**
 * Uploads an image to Supabase storage and returns the public URL
 * @param file The file to upload
 * @param userId The user ID to associate with the file
 * @param bucket The storage bucket name (default: 'avatars')
 * @returns The public URL of the uploaded file or null if upload failed
 */
export async function uploadImage(file: File, userId: string, bucket = "avatars"): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()

    // Check if the bucket exists, create it if it doesn't
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === bucket)
    console.log("Bucket exists:", buckets)

    // Generate a unique file name
    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}_${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    // Upload the file
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return null
    }

    // Get the public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data.publicUrl
  } catch (error) {
    console.error("Error in uploadImage:", error)
    return null
  }
}

/**
 * Deletes an image from Supabase storage
 * @param url The public URL of the image to delete
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    // Extract the path from the URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const urlParts = url.split("/public/")
    if (urlParts.length !== 2) return false

    const [bucketPath, filePath] = urlParts[1].split("/", 1)

    // Delete the file
    const { error } = await supabase.storage.from(bucketPath).remove([filePath])

    if (error) {
      console.error("Error deleting file:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteImage:", error)
    return false
  }
}

"use server";

import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function CreateThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    await connectToDB();
    const createdThread = await Thread.create({
      text,
      author,
      community: null,
    });
    // update user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });
    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Error create Thread: ${error.message}`);
  }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  await connectToDB();
  // Calculate the number of posts to skip
  const skipAmount = (pageNumber - 1) * pageSize;
  // Fetch the posts that have no parents (top-level threads)
  const postsQuery = Thread.find({
    parentId: {
      $in: [null, undefined],
    },
  })
    .sort({
      createdAt: "desc",
    })
    .skip(skipAmount)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "children",
      model: User,
      select: "_id name parentId image",
    });
  const totalPostsCount = await Thread.countDocuments({
    parentId: {
      $in: [null, undefined],
    },
  });
  const posts = await postsQuery.exec();
  const isNext = totalPostsCount > skipAmount + posts.length;
  return { posts, isNext };
}

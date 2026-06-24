-- CreateTable
CREATE TABLE "ChatGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatGroupMember_groupId_userId_key" ON "ChatGroupMember"("groupId", "userId");

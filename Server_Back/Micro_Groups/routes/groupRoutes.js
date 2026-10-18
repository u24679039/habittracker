const express = require("express");
const groupController = require('../Controllers/groupController')

const router = express.Router();

router.post("/", groupController.createGroup);
router.post("/join", groupController.joinGroup);
router.get("/user/:userId", groupController.getUserGroups);
router.get("/:groupId/members", groupController.getMembers);
router.delete("/:groupId/leave", groupController.leaveGroup);
router.delete("/:groupId/members/:memberUserId", groupController.removeMember);
router.patch("/:groupId/members/:memberUserId/role", groupController.updateRole);
router.get("/:groupId", groupController.getGroup);
router.patch("/:groupId", groupController.updateGroup);
router.delete("/:groupId", groupController.deleteGroup);

module.exports = router;

import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection test", function () {
  it("should revert when user tries to collect before unlock time despite having sufficient balance (detects || mutant)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // User deposits 2 ether (more than MinSum = 1 ether)
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(user).Put(0, { value: depositAmount });

    // Now user tries to collect 1 ether BEFORE unlock time (unlockTime was set to block.timestamp by Put(0))
    // Since block.timestamp is not > unlockTime (they're equal), original requires revert
    // But mutant would allow because balance conditions are met
    const collectAmount = ethers.parseEther("1");

    // This should revert on original but might succeed on mutant
    // We expect revert to kill the mutant
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});
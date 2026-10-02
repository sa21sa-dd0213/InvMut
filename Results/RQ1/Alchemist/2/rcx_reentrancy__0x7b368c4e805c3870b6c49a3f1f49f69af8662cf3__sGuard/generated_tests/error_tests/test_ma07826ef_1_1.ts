import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should detect mutant by checking Collect reverts when unlockTime is set to block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;

    // Call Put with _unlockTime equal to current timestamp
    // This means _unlockTime > block.timestamp is FALSE
    // Original sets unlockTime to block.timestamp
    // Mutant sets unlockTime to block.prevrandao (likely much smaller)
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(addr1).Put(currentTime, { value: depositAmount });

    // Now try to Collect the full amount
    // In original: unlockTime == currentTime, so block.timestamp > unlockTime is false -> revert
    // In mutant: unlockTime == block.prevrandao (usually << currentTime), so it might succeed
    await expect(
      wallet.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m34b2815d detection", function () {
  it("should detect mutant where >= replaces > in unlockTime calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address as constructor argument
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xWallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await xWallet.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;

    // Call Put with _unlockTime set to exactly current block.timestamp
    const putAmount = ethers.parseEther("2");
    await xWallet.connect(addr1).Put(currentTimestamp, { value: putAmount });

    // Verify the balance was added
    const holder = await xWallet.Acc(addr1.address);
    expect(holder.balance).to.equal(putAmount);

    // Attempt to Collect immediately (same block, timestamp hasn't increased)
    const collectAmount = ethers.parseEther("1");

    // In both original and mutant, collection should revert because unlockTime == block.timestamp
    await expect(
      xWallet.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});
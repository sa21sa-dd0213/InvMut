import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m4217e4d1 test", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in Put function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const bank = await Factory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2"); // 2 ETH, above MinSum of 1 ETH

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;

    // Deposit with unlockTime = currentTime (should be immediately collectable in original)
    await bank.connect(user).Put(currentTime, { value: depositAmount });

    // In original: unlockTime = currentTime (since currentTime > currentTime is false, uses block.timestamp which equals currentTime)
    // In mutant: unlockTime = block.prevrandao (a huge random number)

    // Wait 2 seconds to ensure block.timestamp > unlockTime in original
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // This should succeed on original (collect works)
    // This should revert on mutant (unlockTime is huge future prevrandao)
    const tx = bank.connect(user).Collect(depositAmount);

    // On original contract: tx succeeds
    // On mutant contract: tx reverts because block.timestamp < block.prevrandao
    await expect(tx).to.not.be.reverted;

    // Verify balance decreased
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(0);
  });
});
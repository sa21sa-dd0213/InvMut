import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m4f9309f1 - Collect condition always false", function () {
  it("should kill mutant by depositing funds, waiting past unlock time, and expecting successful Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(logInstance.target);
    await instance.waitForDeployment();

    // Get current block timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTime = block.timestamp;

    // Deposit 2 ether from addr1 with unlock time = current time + 1 hour (past now)
    const depositAmount = ethers.parseEther("2");
    const unlockTime = currentTime + 3600; // 1 hour from now

    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });

    // Verify initial balance
    let holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Warp time past unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");

    // Try to Collect 1 ether - should succeed on original, fail on mutant
    const collectAmount = ethers.parseEther("1");

    // On original contract this would succeed; on mutant it reverts because condition is always false
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify balance decreased after successful collection
    holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount - collectAmount);
  });
});
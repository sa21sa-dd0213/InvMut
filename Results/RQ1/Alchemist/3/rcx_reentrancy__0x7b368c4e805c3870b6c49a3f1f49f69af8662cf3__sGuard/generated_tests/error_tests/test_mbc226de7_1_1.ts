import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should kill mutant mbc226de7 by depositing 2 ether and then collecting 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit 2 ether from addr1 using Put (or fallback)
    const depositAmount = ethers.parseEther("2");
    const tx = await instance.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();

    // Wait for unlock time to pass (block.timestamp is used, so we need to advance time)
    // The Put function sets unlockTime to max(_unlockTime, block.timestamp)
    // Since we used 0, unlockTime = block.timestamp at time of deposit
    // We need to advance time by at least 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect 1 ether
    const collectAmount = ethers.parseEther("1");

    // In the original contract, this should succeed (balance >= MinSum && balance >= _am)
    // In the mutant, this should fail (balance <= MinSum is false since 2 <= 1 is false)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m9afa7601 test", function () {
  it("should kill the mutant by testing successful Collect after Put", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const collectAmount = ethers.parseEther("1");

    // addr1 deposits ETH via Put
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Verify balance after deposit
    const holderInfo = await instance.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);

    // The unlockTime is set to block.timestamp, so Collect should succeed immediately
    // Attempt Collect - on original this succeeds, on mutant it reverts
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify balance decreased
    const holderInfoAfter = await instance.Acc(addr1.address);
    expect(holderInfoAfter.balance).to.equal(depositAmount - collectAmount);
  });
});
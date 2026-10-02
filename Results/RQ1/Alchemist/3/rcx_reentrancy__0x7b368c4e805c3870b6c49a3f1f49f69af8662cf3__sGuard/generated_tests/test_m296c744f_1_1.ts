import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m296c744f test", function () {
  it("should kill mutant by depositing 1 ether and withdrawing the exact amount", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    const tx1 = await instance.connect(owner).Put(0, { value: depositAmount });
    await tx1.wait();

    // Attempt to withdraw the same amount
    // In the original, this succeeds; in the mutant, balance is 1 wei less so it reverts
    await expect(
      instance.connect(owner).Collect(depositAmount)
    ).to.be.reverted;
  });
});
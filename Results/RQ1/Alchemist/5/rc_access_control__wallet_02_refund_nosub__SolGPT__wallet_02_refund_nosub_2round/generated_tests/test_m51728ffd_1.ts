import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m51728ffd by withdrawing exact full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 100 wei from addr1
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw the exact same amount (should pass on original, fail on mutant)
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.not.be.reverted;
  });
});
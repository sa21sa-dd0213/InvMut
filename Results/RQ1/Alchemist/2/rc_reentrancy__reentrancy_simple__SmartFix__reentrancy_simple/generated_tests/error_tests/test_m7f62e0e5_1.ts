import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m7f62e0e5 test", function () {
  it("should allow withdrawal to an EOA and check balance decreased", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Add balance to addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // Verify balance before withdrawal
    const balanceBefore = await instance.getBalance(addr1.address);
    expect(balanceBefore).to.equal(depositAmount);

    // Attempt withdrawal - should succeed in original but revert in mutant
    const tx = instance.connect(addr1).withdrawBalance();
    await expect(tx).to.not.be.reverted;

    // Verify balance is zero after successful withdrawal
    const balanceAfter = await instance.getBalance(addr1.address);
    expect(balanceAfter).to.equal(0);
  });
});
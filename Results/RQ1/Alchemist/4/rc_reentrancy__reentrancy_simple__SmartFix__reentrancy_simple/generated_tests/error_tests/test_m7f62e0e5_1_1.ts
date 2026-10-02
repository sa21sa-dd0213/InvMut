import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m7f62e0e5 test", function () {
  it("should detect mutant by verifying withdrawal succeeds after deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // Verify balance is recorded
    const balanceBefore = await instance.getBalance(addr1.address);
    expect(balanceBefore).to.equal(depositAmount);

    // Attempt withdrawal - should succeed on original, revert on mutant
    await expect(instance.connect(addr1).withdrawBalance()).to.not.be.reverted;

    // Verify balance is zero after successful withdrawal
    const balanceAfter = await instance.getBalance(addr1.address);
    expect(balanceAfter).to.equal(0);
  });
});
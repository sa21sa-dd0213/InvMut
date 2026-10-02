import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant ma6c2fe6b test", function () {
  it("should succeed in withdrawing balance when recipient is a normal EOA (non-malicious), but mutant always reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Add balance to addr1
    const depositAmount = ethers.parseEther("1.0");
    const txDeposit = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await txDeposit.wait();

    // Check balance before withdrawal
    const balanceBefore = await instance.getBalance(addr1.address);
    expect(balanceBefore).to.equal(depositAmount);

    // Attempt withdrawal - should succeed on original, but mutant will always revert
    await expect(instance.connect(addr1).withdrawBalance()).to.not.be.reverted;

    // Verify balance is zero after successful withdrawal
    const balanceAfter = await instance.getBalance(addr1.address);
    expect(balanceAfter).to.equal(0);
  });
});
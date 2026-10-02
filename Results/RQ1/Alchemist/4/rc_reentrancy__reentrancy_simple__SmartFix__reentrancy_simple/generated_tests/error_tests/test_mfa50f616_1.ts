import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - mfa50f616", function () {
  it("should detect mutant where >= is replaced with <= in addToBalance require statement", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Try to add 1 wei to balance - should succeed on original but fail on mutant
    // because mutant require checks (balance + msg.value) <= balance, which fails for positive msg.value
    await expect(
      instance.addToBalance({ value: ethers.parseEther("0.001") })
    ).to.be.reverted;

    // Verify balance remained unchanged (mutant would revert the transaction)
    const finalBalance = await instance.getBalance(owner.address);
    expect(finalBalance).to.equal(0);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant ma6c2fe6b test", function () {
  it("should successfully withdraw balance and set balance to zero, but mutant reverts always", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Add balance to addr1
    const depositAmount = ethers.parseEther("1.0");
    const addTx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await addTx.wait();

    // Verify balance is set
    const balanceBefore = await instance.getBalance(addr1.address);
    expect(balanceBefore).to.equal(depositAmount);

    // Attempt withdrawal - should succeed in original, revert in mutant
    await expect(
      instance.connect(addr1).withdrawBalance()
    ).to.be.reverted;

    // Verify balance was NOT set to zero (mutant reverts before setting)
    const balanceAfter = await instance.getBalance(addr1.address);
    expect(balanceAfter).to.equal(depositAmount);
  });
});
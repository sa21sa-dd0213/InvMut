import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mfa50f616 test", function () {
  it("should allow adding balance with positive ether in original, but fail in mutant due to <= check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of owner
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Send 1 wei to addToBalance - should succeed in original, but mutant will revert
    const tx = await instance.addToBalance({ value: 1 });
    await tx.wait();

    // Check that balance increased (will fail for mutant because tx reverts)
    const finalBalance = await instance.getBalance(owner.address);
    expect(finalBalance).to.equal(1);
  });
});
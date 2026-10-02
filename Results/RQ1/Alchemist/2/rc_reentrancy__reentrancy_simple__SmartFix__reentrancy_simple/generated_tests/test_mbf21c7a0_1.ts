import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mbf21c7a0", function () {
  it("should detect mutant that changes >= to == in addToBalance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Send 1 wei to addToBalance - this should succeed on original but revert on mutant
    const tx = instance.addToBalance({ value: ethers.parseEther("1") });
    
    // On the original contract, this transaction succeeds
    // On the mutant (with == check), it reverts because 0 + 1 != 0
    await expect(tx).to.be.reverted;
  });
});
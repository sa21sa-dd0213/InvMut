import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - me1f4e7c2", function () {
  it("should kill mutant by calling addToBalance with positive msg.value when balance is zero", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance (should be 0)
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Call addToBalance with 1 wei - should succeed on original, revert on mutant
    const tx = instance.addToBalance({ value: ethers.parseEther("0.000000000000000001") });
    
    // On the mutant, this transaction will revert because the require condition
    // (userBalance[msg.sender] - msg.value) >= userBalance[msg.sender]
    // will be false (0 - 1 >= 0 is false)
    await expect(tx).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m270e41b0 test", function () {
  it("should detect that addToBalance with 1 wei does not update balance correctly", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Send exactly 1 wei to addToBalance
    const tx = await instance.addToBalance({ value: ethers.parseEther("0.000000000000000001") });
    await tx.wait();

    // Check balance after the call
    const finalBalance = await instance.getBalance(owner.address);
    
    // In the original contract, balance should be 1 wei
    // In the mutant, due to msg.value-1 in the require, balance stays 0
    expect(finalBalance).to.equal(ethers.parseEther("0.000000000000000001"));
  });
});
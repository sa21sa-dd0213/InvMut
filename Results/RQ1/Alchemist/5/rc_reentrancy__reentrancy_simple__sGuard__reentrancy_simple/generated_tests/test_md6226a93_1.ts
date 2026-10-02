import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant md6226a93 - getBalance return removal", function () {
  it("should return correct balance after deposit, but mutant returns 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit 1 ETH to owner's balance
    const tx = await instance.connect(owner).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check balance - should be 1 ETH, mutant returns 0
    const balance = await instance.getBalance(owner.address);
    expect(balance).to.equal(depositAmount);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbf21c7a0 detection", function () {
  it("should allow depositing non-zero ether and increase balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    const initialBalance = await instance.getBalance(owner.address);
    
    const tx = await instance.addToBalance({ value: depositAmount });
    await tx.wait();

    const finalBalance = await instance.getBalance(owner.address);
    expect(finalBalance).to.equal(initialBalance + depositAmount);
  });
});
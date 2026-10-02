import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - getBalance return removal", function () {
  it("should detect mutant that removes return statement from getBalance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether
    const depositAmount = ethers.parseEther("1");
    const tx = await instance.addToBalance({ value: depositAmount });
    await tx.wait();

    // Get balance of owner
    const balance = await instance.getBalance(owner.address);

    // Original contract returns 1 ether, mutant returns 0
    expect(balance).to.equal(depositAmount);
  });
});
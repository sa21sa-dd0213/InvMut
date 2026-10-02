import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant md6226a93 - getBalance return removal", function () {
  it("should kill the mutant by depositing ether and then checking the balance returns the correct non-zero value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // Call getBalance - mutant returns 0 instead of the deposited amount
    const balance = await instance.connect(addr1).getBalance(addr1.address);

    // This assertion should fail on the mutant (returns 0) but pass on the original (returns depositAmount)
    expect(balance).to.equal(depositAmount);
  });
});
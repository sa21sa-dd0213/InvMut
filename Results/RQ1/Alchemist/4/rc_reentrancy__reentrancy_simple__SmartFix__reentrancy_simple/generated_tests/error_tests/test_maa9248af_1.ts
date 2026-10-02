import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant maa9248af - kill test", function () {
  it("should detect missing return statement in getBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether to owner's balance
    const depositAmount = ethers.parseEther("1");
    await instance.connect(owner).addToBalance({ value: depositAmount });

    // Get balance using getBalance
    const balance = await instance.connect(owner).getBalance(owner.address);

    // If mutant is present, getBalance returns 0 instead of the actual balance
    // This assertion will fail on the mutant, killing it
    expect(balance).to.equal(depositAmount);
  });
});
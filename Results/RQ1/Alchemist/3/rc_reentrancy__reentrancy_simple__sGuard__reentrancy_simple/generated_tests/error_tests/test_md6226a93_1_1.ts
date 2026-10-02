import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - md6226a93", function () {
  it("should detect mutant that removes return statement from getBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Add balance to addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // Call getBalance and check the returned value
    const balance = await instance.connect(owner).getBalance(addr1.address);

    // On the original contract this returns depositAmount, on the mutant it returns 0
    expect(balance).to.equal(depositAmount);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant maa9248af test", function () {
  it("should detect mutant that removes return statement from getBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ETH to addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // Call getBalance for addr1 - original returns 1 ETH, mutant returns 0
    const balance = await instance.connect(owner).getBalance(addr1.address);
    
    // Assert that balance equals the deposited amount
    // Mutant will fail because it returns 0 instead of 1 ETH
    expect(balance).to.equal(depositAmount);
  });
});
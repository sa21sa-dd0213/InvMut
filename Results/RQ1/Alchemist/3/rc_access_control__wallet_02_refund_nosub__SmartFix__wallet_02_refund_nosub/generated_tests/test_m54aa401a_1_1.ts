import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m54aa401a test", function () {
  it("should allow deposit with positive amount and update balance correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Check balance before deposit
    const balanceBefore = await instance.balances(addr1.address);
    expect(balanceBefore).to.equal(0);

    // Perform deposit from addr1
    await expect(instance.connect(addr1).deposit({ value: depositAmount })).to.not.be.reverted;

    // Check balance after deposit
    const balanceAfter = await instance.balances(addr1.address);
    expect(balanceAfter).to.equal(depositAmount);
  });
});
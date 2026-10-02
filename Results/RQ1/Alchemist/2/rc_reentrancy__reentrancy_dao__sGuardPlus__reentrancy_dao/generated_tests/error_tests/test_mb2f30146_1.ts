import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mb2f30146", function () {
  it("should detect the mutant that subtracts 1 wei from deposit credit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // Perform deposit
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Get the credited balance for addr1
    const credit = await instance.credit(addr1.address);
    
    // The mutant records msg.value - 1 instead of msg.value
    // So the credited balance should be depositAmount - 1 wei if mutant is present
    // Original would have depositAmount exactly
    expect(credit).to.equal(depositAmount);
  });
});
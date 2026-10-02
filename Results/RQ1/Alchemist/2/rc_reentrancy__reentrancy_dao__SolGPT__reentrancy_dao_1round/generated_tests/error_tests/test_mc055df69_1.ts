import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - deposit credit mismatch", function () {
  it("should kill mutant by verifying deposited amount equals credit balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // Perform deposit from addr1
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Check credit balance - in original it should be depositAmount
    // In mutant it will be depositAmount - 1 wei
    const credit = await instance.credit(addr1.address);
    
    // This assertion passes on original but fails on mutant
    expect(credit).to.equal(depositAmount);
  });
});
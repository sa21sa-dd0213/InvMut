import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test", function () {
  it("should kill mutant m03887242 by verifying burn function uses subtraction not division", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute tokens to owner via NETM() function
    await instance.NETM();

    // Get initial balance of owner
    const initialBalance = await instance.balanceOf(owner.address);
    
    // Choose a burn value that would expose the division bug
    // If original uses subtraction: balance = balance - value
    // If mutant uses division: balance = balance / value
    const burnValue = ethers.parseEther("1000");
    
    // Perform the burn
    const tx = await instance.connect(owner).burn(burnValue);
    await tx.wait();
    
    // Get balance after burn
    const balanceAfterBurn = await instance.balanceOf(owner.address);
    
    // In the original: balanceAfter = initialBalance - burnValue
    // In the mutant: balanceAfter = initialBalance / burnValue
    // For the original to be correct: initialBalance - balanceAfter == burnValue
    const expectedBalance = initialBalance - burnValue;
    
    // If this assertion passes, the mutant is killed because the mutant would produce a different result
    expect(balanceAfterBurn).to.equal(expectedBalance);
  });
});
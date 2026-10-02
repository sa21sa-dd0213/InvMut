import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant detection - m340a33d9", function () {
  it("should detect mutant that replaces + with * in distr balance update", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    // First distribution - investor gets tokens
    const initialValue = await contract.value();
    await contract.connect(investor).getTokens();
    
    const balanceAfterFirst = await contract.balanceOf(investor.address);
    // In original: balance = 0 + initialValue = initialValue
    // In mutant: balance = 0 * initialValue = 0
    // So after first call, mutant would show 0 balance
    
    expect(balanceAfterFirst).to.be.gt(0);
  });
});
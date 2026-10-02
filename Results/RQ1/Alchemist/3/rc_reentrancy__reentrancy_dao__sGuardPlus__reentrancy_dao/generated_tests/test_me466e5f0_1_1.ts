import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - me466e5f0", function () {
  it("should kill mutant by calling withdrawAll from address with zero credit and verifying no balance change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // addr1 has zero credit (never deposited)
    await expect(instance.connect(addr1).withdrawAll()).to.not.be.reverted;
    
    // Check contract balance remains unchanged (original: no transfer happens for zero credit)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});
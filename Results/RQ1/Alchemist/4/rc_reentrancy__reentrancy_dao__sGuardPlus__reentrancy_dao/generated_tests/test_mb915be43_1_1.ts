import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill the mutant by verifying balance is updated correctly after deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // Deposit exactly 1 ether
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Check the contract's ether balance - should be exactly 1 ether
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(depositAmount);
    
    // Now withdraw all - this should succeed and return the full 1 ether
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();
    
    // After withdrawal, addr1's balance should have increased by 1 ether (minus gas)
    // And contract balance should be 0
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalContractBalance).to.equal(0);
  });
});
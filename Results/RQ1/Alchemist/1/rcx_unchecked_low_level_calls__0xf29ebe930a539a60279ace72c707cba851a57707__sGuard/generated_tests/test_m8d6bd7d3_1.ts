import { expect } from "chai";
import { ethers } } from "hardhat";

describe("B mutant m8d6bd7d3 test", function () {
  it("should detect the mutant by comparing owner balance after go() call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial owner balance
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    
    // Send 1 ETH to go() from addr1
    const tx = await instance.connect(addr1).go({ value: ethers.parseEther("1.0") });
    await tx.wait();

    // Get final owner balance
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    
    // In the original contract, owner receives the entire contract balance (1 ETH)
    // In the mutant, contract sends 1 ETH to itself first, doubling the balance,
    // so owner receives 2 ETH instead of 1 ETH
    // This difference will cause the assertion to fail on the mutant
    const balanceChange = finalOwnerBalance - initialOwnerBalance;
    expect(balanceChange).to.equal(ethers.parseEther("1.0"));
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mc055df69", function () {
  it("should detect mutant where deposit credits msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Check credit - in original it would be 1, in mutant it's 0
    const credit = await instance.credit(addr1.address);
    
    // Try to withdraw - in original this succeeds, in mutant it reverts because credit is 0
    await expect(instance.connect(addr1).withdrawAll()).to.be.reverted;
    
    // Additionally verify the credit was not credited correctly
    expect(credit).to.equal(0n);
  });
});
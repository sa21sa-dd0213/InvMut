import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant mc055df69 by depositing and withdrawing exact amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit exactly 1 ether
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Attempt to withdraw the full deposited amount
    const tx = instance.connect(addr1).withdrawAll();
    
    // On the original contract this succeeds, on the mutant it should revert
    // due to balance underflow (balance is 1 wei less than actual deposit)
    await expect(tx).to.be.reverted;
  });
});
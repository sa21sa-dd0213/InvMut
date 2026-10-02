import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - md21f04e1", function () {
  it("should revert when transferring more tokens than sender's balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so they have a balance
    await instance.transfer(addr1.address, 100);
    
    // Attempt to transfer more than addr1's balance (100) - should revert
    await expect(
      instance.connect(addr1).transfer(owner.address, 200)
    ).to.be.reverted;
  });
});
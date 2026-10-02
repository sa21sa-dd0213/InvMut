import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - md21f04e1", function () {
  it("should revert when transferring more tokens than sender balance (mutant removes balance check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with initial supply of 1000 tokens (0 decimals)
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(
      initialSupply,
      "TestToken",
      "TT"
    );
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so they have a balance, but less than what we'll try to transfer
    await instance.connect(owner).transfer(addr1.address, 100);
    
    // Attempt to transfer more tokens than addr1 has (200 > 100)
    // Original contract should revert due to balance check
    // Mutant without the check would allow this, breaking token accounting
    await expect(
      instance.connect(addr1).transfer(addr2.address, 200)
    ).to.be.reverted;
  });
});
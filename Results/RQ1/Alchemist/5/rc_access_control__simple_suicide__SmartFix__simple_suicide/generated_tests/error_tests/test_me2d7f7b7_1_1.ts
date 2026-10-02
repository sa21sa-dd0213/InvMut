import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant test - me2d7f7b7", function () {
  it("should allow owner to call sudicideAnyone and selfdestruct, but mutant with != will revert for owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for SimpleSuicide)
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the deployed contract address to check it exists
    const contractAddress = await instance.getAddress();
    
    // Owner calls sudicideAnyone - should succeed in original but fail in mutant
    await expect(
      instance.connect(owner).sudicideAnyone()
    ).to.not.be.reverted;
    
    // Verify the contract was self-destructed (optional check)
    const code = await ethers.provider.getCode(contractAddress);
    expect(code).to.equal("0x");
  });
});
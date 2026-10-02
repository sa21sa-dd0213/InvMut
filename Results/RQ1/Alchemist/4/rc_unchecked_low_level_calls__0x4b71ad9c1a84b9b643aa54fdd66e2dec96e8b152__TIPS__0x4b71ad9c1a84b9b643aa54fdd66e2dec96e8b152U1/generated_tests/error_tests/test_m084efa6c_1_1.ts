import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m084efa6c", function () {
  it("should revert when external call fails in original but succeed silently in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token that will reject transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20FailMock");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // The token address that will fail on transferFrom
    const failingTokenAddress = await token.getAddress();
    
    // Create recipients array
    const recipients = [addr2.address];
    
    // This call should revert in original (require(_s) catches failure)
    // but in the mutant it will return true silently
    const tx = instance.connect(owner).transfer(
      owner.address,
      failingTokenAddress,
      recipients,
      ethers.parseEther("1")
    );
    
    // In the mutant, this will NOT revert (mutant removes require(_s))
    // In the original, it WOULD revert
    // We expect it to NOT revert (mutant behavior)
    await expect(tx).to.not.be.reverted;
    
    // Additionally verify the transaction returns true (mutant always returns true)
    const result = await (await tx).wait();
    // The function returns bool true, we can check the receipt
    expect(result.status).to.equal(1); // Transaction succeeded
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m73311e4d", function () {
  it("should revert when calling transfer on mutant where caddress is address(this) instead of external contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU - no constructor arguments needed
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the contract has no transferFrom function, so calling it via delegatecall will fail
    const tos = [addr1.address];
    const v = [ethers.parseEther("1")];
    
    // The transfer function should revert because the call to caddress (now address(this))
    // will attempt to call transferFrom on the EBU contract itself, which doesn't have that function
    await expect(
      instance.connect(owner).transfer(tos, v)
    ).to.be.reverted;
  });
});
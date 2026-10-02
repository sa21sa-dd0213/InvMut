import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - m168d11a5", function () {
  it("should detect removal of overflow check in _transfer by comparing gas usage", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer a small amount to addr1 to set up balance
    await instance.transfer(addr1.address, 100);
    
    // Get gas used for a normal transfer - this should be higher with the original's extra require
    const tx1 = await instance.connect(addr1).transfer(owner.address, 10);
    const receipt1 = await tx1.wait();
    const gasUsedWithCheck = receipt1.gasUsed;
    
    // Deploy a new instance and repeat the same transfer
    const instance2 = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance2.waitForDeployment();
    await instance2.transfer(addr1.address, 100);
    
    const tx2 = await instance2.connect(addr1).transfer(owner.address, 10);
    const receipt2 = await tx2.wait();
    const gasUsedWithoutCheck = receipt2.gasUsed;
    
    // The mutant (which removes the require) should use less gas
    // In the original, the overflow check consumes extra gas
    expect(gasUsedWithoutCheck).to.be.lessThan(gasUsedWithCheck);
  });
});
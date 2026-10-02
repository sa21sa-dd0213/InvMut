import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array has length > 0 and mutant has i <= _tos.length causing out-of-bounds access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU - no constructor arguments needed based on provided contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data: one recipient and one value
    const recipients = [addr1.address];
    const values = [ethers.parseEther("1")];
    
    // The mutant changes loop condition to i <= _tos.length
    // When _tos.length = 1, loop will try i=0 and i=1
    // i=1 will access _tos[1] and v[1] which are out of bounds
    // This should cause a revert on the mutant
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, values)
    ).to.be.reverted;
  });
});
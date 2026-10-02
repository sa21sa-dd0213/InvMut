import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m0c4573f7", function () {
  it("should revert when _tos array is empty (original behavior) vs mutant that would succeed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for airPort)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare an empty _tos array
    const emptyArray: string[] = [];
    
    // Call transfer with empty array - should revert due to require(_tos.length > 0)
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        emptyArray,
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mf7e6a611 test", function () {
  it("should revert when calling transfer with zero address as contract_address on original, but not on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare valid recipient addresses and amounts
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];
    
    // Call transfer with zero address as contract_address - should revert on original
    await expect(
      instance.connect(owner).transfer(
        ethers.ZeroAddress,
        tos,
        vs
      )
    ).to.be.reverted;
  });
});
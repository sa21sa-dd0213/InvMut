import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant test - m4a723d66", function () {
  it("should revert when contract address is passed as contract_address parameter (original behavior)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Create test arrays (length > 0, matching lengths)
    const tos = [owner.address];
    const vs = [100];
    
    // Call transfer with the contract's own address - should revert on original
    await expect(
      instance.transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract - kill mutant m86a121b3", function () {
  it("should revert when calling transfer with a valid non-zero contract_address (mutant expects zero address)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like contract to use as a valid contract_address
    const TokenFactory = await ethers.getContractFactory("AirDropContract");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    const tokenAddress = await token.getAddress();
    
    // Prepare test data: one recipient with amount
    const tos = [addr1.address];
    const vs = [100];
    
    // In the original contract, this should succeed (valid non-zero address)
    // In the mutant, it should revert because contract_address != address(0) triggers the == check to fail
    await expect(
      instance.connect(owner).transfer(tokenAddress, tos, vs)
    ).to.be.reverted;
  });
});
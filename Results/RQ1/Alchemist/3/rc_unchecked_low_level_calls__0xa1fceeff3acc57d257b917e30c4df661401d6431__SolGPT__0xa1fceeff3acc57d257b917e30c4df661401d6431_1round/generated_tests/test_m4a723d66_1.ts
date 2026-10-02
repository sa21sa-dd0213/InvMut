import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection", function () {
  it("should revert when contract address is passed as contract_address parameter in original but pass in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Create arrays for the transfer function
    const tos = [addr1.address];
    const vs = [100];
    
    // Attempt to call transfer with the contract's own address
    // In the original contract, this should revert due to the validAddress modifier
    // In the mutant (which removes the self-reference check), this would pass
    await expect(
      instance.transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});
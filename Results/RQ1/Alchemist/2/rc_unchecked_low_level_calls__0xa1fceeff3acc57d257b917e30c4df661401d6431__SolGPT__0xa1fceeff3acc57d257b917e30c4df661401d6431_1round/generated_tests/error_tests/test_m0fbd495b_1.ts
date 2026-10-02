import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m0fbd495b", function () {
  it("should kill mutant by calling transfer with non-empty vs array (mutant changes require(vs.length > 0) to require(vs.length < 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple token contract that supports transferFrom
    // We need a contract address to pass as contract_address parameter
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Prepare valid arrays with matching lengths
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("1"), ethers.parseEther("2")];
    
    // The original requires vs.length > 0, which passes with 2 elements
    // The mutant requires vs.length < 0, which always fails since length can't be negative
    // So calling transfer with valid non-empty arrays should revert on mutant
    await expect(
      instance.connect(owner).transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});
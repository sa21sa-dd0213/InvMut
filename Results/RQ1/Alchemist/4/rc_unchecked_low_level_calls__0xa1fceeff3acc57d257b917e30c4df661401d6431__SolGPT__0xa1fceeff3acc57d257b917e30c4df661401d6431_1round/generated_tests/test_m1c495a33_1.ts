import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection", function () {
  it("should kill mutant m1c495a33 by calling transfer with a valid external contract address", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Deploy a simple external token contract that has transferFrom function
    const TokenFactory = await ethers.getContractFactory("contracts/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy(ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund the owner with tokens so they can transferFrom
    await token.approve(await airDrop.getAddress(), ethers.parseEther("100"));
    
    // Prepare transfer parameters: tos and vs arrays with single element
    const tos = [owner.address];
    const vs = [ethers.parseEther("10")];
    
    // This call should succeed on original contract (contract_address != address(this))
    // but fail on mutant (which requires contract_address == address(this))
    await expect(
      airDrop.transfer(await token.getAddress(), tos, vs)
    ).to.not.be.reverted;
  });
});
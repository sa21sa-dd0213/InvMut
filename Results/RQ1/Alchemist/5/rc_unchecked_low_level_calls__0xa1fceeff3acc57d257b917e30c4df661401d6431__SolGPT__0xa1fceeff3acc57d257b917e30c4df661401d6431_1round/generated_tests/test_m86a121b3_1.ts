import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant detection test", function () {
  it("should kill mutant m86a121b3 by calling transfer with a valid non-zero contract address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like contract to use as the contract_address parameter
    // Since AirDropContract calls transferFrom on the contract_address, we need a contract that implements it
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund owner with tokens and approve the AirDropContract to spend them
    await token.transfer(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Prepare arrays for the transfer function
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];
    
    // This call should succeed on the original contract but fail on the mutant
    // because the mutant requires contract_address == address(0) which is false for the token address
    await expect(
      instance.connect(owner).transfer(await token.getAddress(), tos, vs)
    ).to.not.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m86a121b3", function () {
  it("should revert when calling transfer with a valid non-zero contract address due to mutant modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like token to use as the contract_address parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Fund the owner with tokens and approve the AirDropContract to spend them
    const amount = ethers.parseEther("10");
    await token.mint(owner.address, amount);
    await token.approve(await instance.getAddress(), amount);
    
    // Prepare arrays for transfer
    const recipients = [addr1.address];
    const values = [ethers.parseEther("5")];
    
    // Call transfer - should revert because the mutant requires contract_address == address(0)
    await expect(
      instance.connect(owner).transfer(await token.getAddress(), recipients, values)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert when tos.length > vs.length on original but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token to use for the airdrop
    const Token = await ethers.getContractFactory("TestToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    
    // Fund owner with tokens and approve the AirDropContract
    const amount = ethers.parseEther("100");
    await token.mint(owner.address, amount);
    await token.approve(owner.address, amount); // Not needed, but approve the contract
    
    const AirDrop = await ethers.getContractFactory("AirDropContract");
    const airdrop = await AirDrop.deploy();
    await airdrop.waitForDeployment();
    
    // Owner approves the airdrop contract to spend tokens
    await token.approve(await airdrop.getAddress(), amount);
    
    // Prepare arrays with mismatched lengths (tos longer than vs)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10")]; // Only one value for two addresses
    
    // This should revert on the original contract due to length mismatch
    // On the mutant with >=, it would not revert, killing the mutant
    await expect(
      airdrop.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});
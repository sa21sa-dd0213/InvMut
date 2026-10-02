import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m56294547", function () {
  it("should revert when owner calls onlyOwner function due to inverted modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments: initialSupply, tokenName, tokenSymbol
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when owner calls an onlyOwner function, it should revert
    // because owner != owner is false, causing the require to fail
    
    // Try calling freezeAccount (onlyOwner) from the owner address
    // Original: should succeed
    // Mutant: should revert
    await expect(
      instance.connect(owner).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});
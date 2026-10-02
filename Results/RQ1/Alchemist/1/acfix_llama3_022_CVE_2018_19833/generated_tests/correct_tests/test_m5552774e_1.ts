import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call onlyOwner functions, but mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with initial supply, name, and symbol
    const initialSupply = ethers.parseEther("1000");
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner calls freezeAccount - should succeed on original, revert on mutant
    await expect(
      instance.connect(owner).freezeAccount(addr1.address, true)
    ).to.not.be.reverted;

    // Verify the account was actually frozen (to confirm the call succeeded)
    const isFrozen = await instance.frozenAccount(addr1.address);
    expect(isFrozen).to.equal(true);
  });
});
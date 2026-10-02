import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant mffbccf95 - transfer to zero address", function () {
  it("should revert when transferring to zero address (address(0))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so we can test transfer from a non-owner
    await instance.transfer(addr1.address, 100);
    
    // Attempt to transfer from addr1 to zero address - should revert in original, but may succeed in mutant
    await expect(
      instance.connect(addr1).transfer(ethers.ZeroAddress, 50)
    ).to.be.reverted;
  });
});
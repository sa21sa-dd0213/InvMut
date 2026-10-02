import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should revert when non-owner calls burn (mutant removed onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Give addr1 some tokens to burn (so the balance check passes)
    const transferAmount = 100;
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Non-owner tries to burn - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).burn(transferAmount)
    ).to.be.reverted;
  });
});
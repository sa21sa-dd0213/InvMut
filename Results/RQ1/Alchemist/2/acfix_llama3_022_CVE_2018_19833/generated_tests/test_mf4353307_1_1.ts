import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - mintToken modifier removal", function () {
  it("should revert when non-owner calls mintToken", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to call mintToken from a non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).mintToken(addr1.address, 100)
    ).to.be.reverted;
  });
});
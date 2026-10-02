import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - m5183008a", function () {
  it("should revert when non-owner calls freezeAccount (mutant removes owner check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to call freezeAccount from non-owner address
    await expect(
      instance.connect(addr1).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});
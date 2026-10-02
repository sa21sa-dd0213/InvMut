import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - updatePrice auth modifier", function () {
  it("should revert when unauthorized user calls updatePrice", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy with constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const asset = "0x0000000000000000000000000000000000000001";
    const share = "0x0000000000000000000000000000000000000002";
    const investmentManager = "0x0000000000000000000000000000000000000003";
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(poolId, trancheId, asset, share, investmentManager);
    await instance.waitForDeployment();

    // Attempt to call updatePrice from unauthorized address
    // In original contract, this should revert due to auth modifier
    await expect(
      instance.connect(unauthorizedUser).updatePrice(100)
    ).to.be.reverted;
  });
});
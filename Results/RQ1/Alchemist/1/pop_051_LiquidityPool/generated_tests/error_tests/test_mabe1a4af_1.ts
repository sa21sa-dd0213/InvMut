import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool - mutant mabe1a4af test", function () {
  it("should revert when unauthorized user tries to call file()", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy with constructor arguments
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test");
    const asset = "0x0000000000000000000000000000000000000001";
    const share = "0x0000000000000000000000000000000000000002";
    const investmentManager = "0x0000000000000000000000000000000000000003";
    
    const instance = await LiquidityPool.deploy(
      poolId,
      trancheId,
      asset,
      share,
      investmentManager
    );
    await instance.waitForDeployment();

    // Attempt to call file() from unauthorized user
    await expect(
      instance.connect(unauthorizedUser).file(
        ethers.encodeBytes32String("investmentManager"),
        "0x0000000000000000000000000000000000000004"
      )
    ).to.be.revertedWith("Auth/not-authorized");
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - m11a00fc2", function () {
  it("should revert when calling file() with unrecognized parameter, but mutant does not revert", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with constructor arguments: poolId, trancheId, asset, share, investmentManager
    // Using zero addresses as placeholders since we only need to test the file() function
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("testTranche");
    const asset = ethers.ZeroAddress;
    const share = ethers.ZeroAddress;
    const investmentManager = ethers.ZeroAddress;

    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(poolId, trancheId, asset, share, investmentManager);
    await instance.waitForDeployment();

    // Call file() with an unrecognized parameter - should revert in original
    // In the mutant, this will not revert (the revert statement was removed)
    await expect(
      instance.connect(owner).file(ethers.encodeBytes32String("invalidParam"), ethers.ZeroAddress)
    ).to.be.reverted;
  });
});
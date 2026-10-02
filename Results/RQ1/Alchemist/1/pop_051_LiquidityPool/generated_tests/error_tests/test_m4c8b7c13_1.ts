import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - requestRedeem access control", function () {
  it("should revert when unauthorized address calls requestRedeem on behalf of owner (original) but succeed on mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const assetAddress = "0x0000000000000000000000000000000000000001"; // placeholder
    const shareAddress = "0x0000000000000000000000000000000000000002"; // placeholder
    const investmentManagerAddress = "0x0000000000000000000000000000000000000003"; // placeholder
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      assetAddress,
      shareAddress,
      investmentManagerAddress
    );
    await instance.waitForDeployment();

    // Test: unauthorized address tries to call requestRedeem on behalf of owner
    // The original contract would revert with "LiquidityPool/no-approval"
    // The mutant (without withApproval modifier) would allow it to proceed
    await expect(
      instance.connect(unauthorized).requestRedeem(100, owner.address)
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});